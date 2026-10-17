import { z } from 'zod';
import { auth } from './_lib/auth.js';
import { query, transaction } from './_lib/db.js';
import { HttpError, endpoint, findMembership, json, readJson, requireUser } from './_lib/http.js';
import { deleteFamilyFiles, deleteFiles } from './_lib/storage.js';

// Direitos do titular (LGPD, art. 18): baixar os dados e excluir a conta ou o espaço.

const DATA_TABLES = [
  'symptoms_log',
  'partner_comments',
  'medical_appointments',
  'partner_tasks',
  'health_metrics_log',
  'consultations',
  'kick_sessions',
  'contractions',
  'birth_plan',
  'checklist',
] as const;

/** Tudo o que a pessoa e o espaço dela têm guardado, em JSON. */
export const GET = endpoint(async request => {
  const user = await requireUser(request);
  const member = await findMembership(user.id);
  const consents = await query('SELECT version, accepted_at FROM user_consents WHERE user_id = $1 ORDER BY accepted_at', [user.id]);

  // Notificações: o que a pessoa escolheu receber e em quantos aparelhos está ativo.
  const notifications = await Promise.all([
    query('SELECT consultas, momentos, jornada, parceiro, updated_at FROM notification_prefs WHERE user_id = $1', [user.id]),
    query('SELECT user_agent, created_at FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at', [user.id]),
  ])
    .then(([prefs, devices]) => ({ prefs: prefs[0] ?? null, devices }))
    .catch(() => null);

  let space: Record<string, unknown> | null = null;
  if (member) {
    const fid = member.familyId;
    const [profile, members, ...tables] = await Promise.all([
      query('SELECT * FROM families WHERE id = $1', [fid]),
      query(
        `SELECT u.name, u.email, m.role, m.joined_at FROM family_members m JOIN "user" u ON u.id = m.user_id WHERE m.family_id = $1 ORDER BY m.joined_at`,
        [fid],
      ),
      ...DATA_TABLES.map(t => query(`SELECT * FROM ${t} WHERE family_id = $1 ORDER BY ${t === 'birth_plan' ? 'updated_at' : 'created_at'}`, [fid]).catch(() => [])),
    ]);
    // Momentos: os do próprio titular e os compartilhados; nunca os particulares de outra pessoa.
    const journal = await query(
      `SELECT entry_date, body, visibility, remind_on, author_role, created_at FROM journal_entries
       WHERE family_id = $1 AND (visibility = 'shared' OR user_id = $2) ORDER BY entry_date`,
      [fid, user.id],
    ).catch(() => []);
    // Exames: a lista com os arquivos de cada um. As fotos e PDFs em si se baixam pelo app.
    const exams = await query(
      `SELECT e.kind, e.title, e.exam_date, e.plan_item, e.notes, e.visibility, e.author_role, e.created_at,
              (SELECT COUNT(*)::int FROM exam_files f WHERE f.exam_id = e.id) AS arquivos
       FROM exams e WHERE e.family_id = $1 AND (e.visibility = 'shared' OR e.user_id = $2) ORDER BY e.exam_date`,
      [fid, user.id],
    ).catch(() => []);
    space = { profile: profile[0] ?? null, members, ...Object.fromEntries(DATA_TABLES.map((t, i) => [t, tables[i]])), journal_entries: journal, exams };
  }

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: { name: user.name, email: user.email, createdAt: user.createdAt, role: member?.role ?? null },
      consents,
      notifications,
      space,
    },
    null,
    2,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="tumtum-dados-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});

const ops = z.discriminatedUnion('op', [
  // A pessoa digita EXCLUIR para confirmar: evita toque acidental.
  z.object({ op: z.literal('deleteAccount'), confirm: z.literal('EXCLUIR') }),
  z.object({ op: z.literal('deleteSpace'), confirm: z.literal('EXCLUIR') }),
]);

export const POST = endpoint(async request => {
  const user = await requireUser(request);
  const parsed = ops.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(400, 'Digite EXCLUIR para confirmar.');
  const member = await findMembership(user.id);
  // Arquivos que saem junto, apagados do armazenamento depois que o banco confirmar.
  let removeSpaceFiles = false;
  let removePaths: string[] = [];

  await transaction(async client => {
    if (member) {
      const { rows } = await client.query('SELECT user_id FROM family_members WHERE family_id = $1 FOR UPDATE', [member.familyId]);
      // Excluir o espaço (qualquer membro pode: poderes iguais) ou sair sendo a última pessoa:
      // o espaço e todos os registros somem junto (ON DELETE CASCADE).
      if (parsed.data.op === 'deleteSpace' || rows.length <= 1) {
        await client.query('DELETE FROM families WHERE id = $1', [member.familyId]);
        removeSpaceFiles = true;
      }
    }
    if (parsed.data.op === 'deleteAccount') {
      // Anotações particulares saem com a conta; as compartilhadas ficam no espaço.
      const { rows: table } = await client.query("SELECT to_regclass('public.journal_entries') AS t");
      if (table[0].t) await client.query("DELETE FROM journal_entries WHERE user_id = $1 AND visibility = 'private'", [user.id]);
      // Exames particulares também; os compartilhados ficam com o espaço.
      const { rows: exams } = await client.query("SELECT to_regclass('public.exam_files') AS t");
      if (exams[0].t) {
        const { rows: files } = await client.query(
          `DELETE FROM exam_files f USING exams e WHERE f.exam_id = e.id AND e.user_id = $1 AND e.visibility = 'private' RETURNING f.path`,
          [user.id],
        );
        removePaths = files.map((f: { path: string }) => f.path);
        await client.query("DELETE FROM exams WHERE user_id = $1 AND visibility = 'private'", [user.id]);
      }
      // Sessões, contas de login, consentimentos e vínculo com o espaço vão junto.
      await client.query('DELETE FROM "user" WHERE id = $1', [user.id]);
    }
  });

  if (member && removeSpaceFiles) await deleteFamilyFiles(member.familyId).catch(err => console.error('Arquivos do espaço não apagados', err));
  else await deleteFiles(removePaths).catch(err => console.error('Arquivos particulares não apagados', err));

  // Apaga os cookies do login neste aparelho: o login guardado em cookie
  // (que evita ir ao banco a cada chamada) não pode sobreviver à conta.
  const res = json({ ok: true });
  if (parsed.data.op === 'deleteAccount') {
    const { authCookies } = await auth.$context;
    for (const c of [authCookies.sessionToken, authCookies.sessionData, authCookies.dontRememberToken]) {
      res.headers.append('Set-Cookie', `${c.name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${c.attributes.secure ? '; Secure' : ''}`);
    }
  }
  return res;
});
