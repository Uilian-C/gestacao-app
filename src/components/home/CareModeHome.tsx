import { BookHeart, HeartHandshake, Mail, NotebookPen, Phone, Stethoscope } from 'lucide-react';
import type { Checkin, Folder, Hug, Mood } from '../../hooks/useGestationData';
import type { Author } from '../../types';
import BrandMark from '../BrandMark';
import CheckIn from '../CheckIn';
import { Fold } from '../ui';

// O Início do modo cuidado: quando a gestação é interrompida, nada de semana,
// contagem, presente ou celebração. Fica um lugar quieto para os dois contarem
// como estão, guardarem o que quiserem, cuidarem do corpo e saberem onde
// buscar apoio. Tudo o que foi vivido continua no livro.

interface Props {
  role: Author;
  partnerName: string | null;
  checkins: Checkin[];
  hugs: Hug[];
  checkinAvailable: boolean;
  onCheckin: (mood: Mood | null) => Promise<boolean>;
  onHug: () => Promise<boolean>;
  onWrite: (folder: Folder) => void;
  onBook: () => void;
}

export default function CareModeHome(props: Props) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="cuidado-titulo" className="relative pt-4 text-center">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[300px] h-[220px] rounded-full bg-[radial-gradient(closest-side,var(--color-lilas-soft),transparent)] opacity-80 blur-2xl" />
        <BrandMark className="relative mx-auto w-16 h-16 opacity-90" />
        <h2 id="cuidado-titulo" className="relative mt-4 font-display text-[1.6rem] leading-tight text-ink">Estamos aqui com vocês</h2>
        <p className="relative mx-auto mt-2 max-w-[330px] text-[14.5px] leading-relaxed text-ink-soft">
          Sentimos muito. Pausamos os avisos de semana, as contagens e as celebrações. O que vocês viveram continua guardado, no tempo de vocês.
        </p>
      </section>

      {/* Contar como está e mandar um abraço, sem a "resposta do bebê". */}
      {props.checkinAvailable && <CheckIn quiet role={props.role} checkins={props.checkins} hugs={props.hugs} onCheckin={props.onCheckin} onHug={props.onHug} />}

      <section aria-label="Guardar" className="grid grid-cols-1 gap-2.5">
        <Action icon={<Mail />} title="Escrever uma carta" text="Para o bebê, para vocês, para ler quando quiserem." onClick={() => props.onWrite('carta')} />
        <Action icon={<NotebookPen />} title="Guardar uma lembrança" text="Um nome, uma foto, o que não querem esquecer." onClick={() => props.onWrite('momento')} />
        <Action icon={<BookHeart />} title="O que vocês viveram" text="O livro continua aqui, do jeito que ficou." onClick={props.onBook} />
      </section>

      <Fold icon={<Stethoscope />} title="Cuidar do corpo agora" summary="Quando procurar atendimento">
        <div className="space-y-2.5 text-[14px] leading-relaxed text-ink">
          <p>Nos próximos dias, a equipe que acompanha vocês deve orientar a revisão e os cuidados. Descanso e ajuda em casa fazem diferença.</p>
          <p className="font-bold">Procurem atendimento logo se houver:</p>
          <ul className="list-disc pl-5 space-y-1 text-ink-soft">
            <li>sangramento forte (encher mais de um absorvente por hora);</li>
            <li>febre ou calafrios;</li>
            <li>dor forte na barriga que não passa;</li>
            <li>corrimento com cheiro forte;</li>
            <li>tontura ou desmaio.</li>
          </ul>
        </div>
      </Fold>

      <Fold icon={<HeartHandshake />} title="Apoio para os dois" summary="Ninguém precisa passar por isso sozinho">
        <div className="space-y-3 text-[14px] leading-relaxed text-ink">
          <p>O luto é dos dois, e cada um sente de um jeito. Conversar, chorar e pedir ajuda faz parte.</p>
          <a href="tel:188" className="flex items-center gap-3 rounded-2xl bg-lilas-soft px-4 py-3 text-ink">
            <Phone className="w-5 h-5 shrink-0 text-lilas-strong" />
            <span>
              <span className="block font-bold">CVV · 188</span>
              <span className="block text-[13px] text-ink-soft">Ligação gratuita, 24 horas, para conversar com alguém. Também tem chat em cvv.org.br.</span>
            </span>
          </a>
          <p className="text-ink-soft">A equipe de saúde pode indicar acompanhamento psicológico, inclusive pelo SUS, e grupos de apoio ao luto gestacional na cidade de vocês.</p>
        </div>
      </Fold>

      <p className="px-2 text-center text-[12.5px] leading-relaxed text-ink-mute">Quando quiserem, em Nosso espaço dá para desligar o modo cuidado.</p>
    </div>
  );
}

function Action({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-[22px] bg-surface/80 px-4 py-3.5 text-left shadow-[0_1px_0_var(--color-line)] transition active:scale-[0.99]">
      <span className="w-10 h-10 rounded-2xl bg-lilas-soft text-lilas-strong flex items-center justify-center shrink-0 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>
      <span className="min-w-0">
        <span className="block font-display text-[1.05rem] leading-tight text-ink">{title}</span>
        <span className="block mt-0.5 text-[13px] text-ink-soft">{text}</span>
      </span>
    </button>
  );
}
