import type { ContentItem } from '../api';
import type { Author } from '../types';

// Mensagem do dia e leituras da semana (conteúdo publicado na administração).
// Vale o que cobre a semana da gestação e é para o casal ou para quem está logado.

const fits = (item: ContentItem, week: number, role: Author) => item.status === 'publicado' && week >= item.weekFrom && week <= item.weekTo && (item.audience === 'casal' || item.audience === role);

/**
 * Uma mensagem por dia, a mesma o dia todo (e diferente amanhã). Entre as que
 * servem, as mais específicas da fase vêm antes das que valem a gestação toda.
 */
export function messageOfDay(items: ContentItem[], week: number, role: Author, day: Date): ContentItem | null {
  const list = items
    .filter(i => i.kind === 'mensagem' && fits(i, week, role))
    .sort((a, b) => a.weekTo - a.weekFrom - (b.weekTo - b.weekFrom) || a.id.localeCompare(b.id));
  if (!list.length) return null;
  const n = Math.floor(new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() / 86_400_000);
  return list[n % list.length];
}

/** Leituras desta semana: primeiro as da fase (janela mais curta), depois as gerais. */
export function readingsFor(items: ContentItem[], week: number, role: Author): ContentItem[] {
  return items
    .filter(i => i.kind === 'leitura' && fits(i, week, role))
    .sort((a, b) => a.weekTo - a.weekFrom - (b.weekTo - b.weekFrom) || (a.title ?? '').localeCompare(b.title ?? ''));
}

/** O texto em blocos: parágrafos e listas (linhas que começam com "- "). */
export function textBlocks(body: string): Array<{ kind: 'p'; text: string } | { kind: 'ul'; items: string[] }> {
  const blocks: Array<{ kind: 'p'; text: string } | { kind: 'ul'; items: string[] }> = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
    let para: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
      if (list.length) blocks.push({ kind: 'ul', items: list });
      para = [];
      list = [];
    };
    for (const l of lines) {
      if (l.startsWith('- ')) {
        if (para.length) {
          blocks.push({ kind: 'p', text: para.join(' ') });
          para = [];
        }
        list.push(l.slice(2));
      } else {
        if (list.length) {
          blocks.push({ kind: 'ul', items: list });
          list = [];
        }
        para.push(l);
      }
    }
    flush();
  }
  return blocks;
}
