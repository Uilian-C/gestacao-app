import { BookHeart, CalendarHeart, Footprints, HandHeart, Heart, HeartHandshake, Luggage, Route, ShieldCheck, Smartphone, Stethoscope, Timer } from 'lucide-react';
import BrandMark from '../BrandMark';

// A apresentação do Tumtum para quem chega pela primeira vez: o que o app é
// (a gestação vivida a dois, não só a organização de exames), uma prévia do
// Início, os pilares, como começar e a privacidade. Só promete o que o app faz.

const PILLARS = [
  {
    Icon: CalendarHeart,
    tone: 'bg-rosa-soft text-rosa-strong',
    title: 'Semana a semana',
    text: 'O tamanho do bebê, o que muda no corpo e uma dica para o pai, toda semana.',
  },
  {
    Icon: HeartHandshake,
    tone: 'bg-coral-soft text-coral-strong',
    title: 'Juntos todo dia',
    text: 'Como cada um está, um abraço com um toque e o Mural do casal, com fotos e marcações.',
  },
  {
    Icon: BookHeart,
    tone: 'bg-lilas-soft text-lilas-strong',
    title: 'Memórias',
    text: 'Diário, a foto da barriguinha de cada semana e cartas para o bebê ler um dia.',
  },
  {
    Icon: Route,
    tone: 'bg-verde-soft text-verde-strong',
    title: 'Pré-natal sem esquecer nada',
    text: 'A jornada de exames e vacinas, a agenda com lembretes e um resumo pronto para levar à consulta.',
  },
];

const STEPS = ['Criem o espaço e informem a data da última menstruação.', 'Convidem o parceiro ou a parceira com um link.', 'Usem juntos, cada um no seu celular.'];

export default function Landing({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <div className="space-y-10">
      {/* Abertura */}
      <header className="space-y-5 text-center lg:text-left">
        <div className="flex items-center justify-center lg:justify-start gap-3">
          <span className="w-14 h-14 rounded-[20px] bg-surface shadow-soft flex items-center justify-center">
            <BrandMark animated className="w-9 h-9" />
          </span>
          <span className="text-left">
            <h1 className="text-[1.6rem] leading-none">Tumtum</h1>
            <p className="font-display italic text-ink-soft text-[15px]">Desde o primeiro tumtum.</p>
          </span>
        </div>
        <h2 className="font-display text-[2.1rem] sm:text-[2.6rem] leading-[1.1] text-ink text-balance">A gestação de vocês, vivida a dois.</h2>
        <p className="text-[16.5px] text-ink-soft text-balance max-w-xl mx-auto lg:mx-0">
          Acompanhem o bebê semana a semana, cuidem um do outro e guardem cada momento. E, na hora da consulta, está tudo organizado.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start">
          <button type="button" onClick={onStart} className="rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-on-accent shadow-soft transition hover:brightness-110 active:scale-[0.98]">
            Criar o nosso espaço
          </button>
          <button type="button" onClick={onLogin} className="rounded-full bg-surface px-6 py-3 text-[15px] font-bold text-ink shadow-soft transition hover:bg-surface-2">
            Já tenho conta
          </button>
        </div>
      </header>

      <Preview />

      {/* Pilares */}
      <section aria-labelledby="pilares" className="space-y-4">
        <h3 id="pilares" className="text-[1.35rem] text-ink text-center lg:text-left">Tudo o que a gestação pede, num lugar só</h3>
        <ul className="grid sm:grid-cols-2 gap-3">
          {PILLARS.map(({ Icon, tone, title, text }) => (
            <li key={title} className="rounded-[24px] bg-surface shadow-soft p-4 flex gap-3.5">
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span>
                <span className="block font-bold text-ink">{title}</span>
                <span className="block text-sm text-ink-soft mt-0.5">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span className="font-semibold text-ink">E na reta final:</span>
          <span className="inline-flex items-center gap-1"><HandHeart className="w-4 h-4 text-brand" /> plano de parto</span>
          <span className="inline-flex items-center gap-1"><Luggage className="w-4 h-4 text-brand" /> mala da maternidade</span>
          <span className="inline-flex items-center gap-1"><Timer className="w-4 h-4 text-brand" /> contador de contrações</span>
        </p>
      </section>

      {/* Como começar */}
      <section aria-labelledby="como-comecar" className="rounded-[28px] bg-surface-2/70 p-5 space-y-3">
        <h3 id="como-comecar" className="text-[1.2rem] text-ink">Comecem em um minuto</h3>
        <ol className="space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-start gap-3 text-[15px] text-ink">
              <span className="w-7 h-7 rounded-full bg-brand text-on-accent text-sm font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Confiança */}
      <ul className="grid sm:grid-cols-2 gap-3 text-sm text-ink-soft">
        <li className="flex gap-3">
          <ShieldCheck className="w-5 h-5 text-ok shrink-0" />
          <span>
            <strong className="text-ink">Os dados são só do casal.</strong> Só quem vocês convidarem vê os registros, e dá para baixar ou apagar tudo quando quiserem (LGPD).
          </span>
        </li>
        <li className="flex gap-3">
          <Smartphone className="w-5 h-5 text-brand shrink-0" />
          <span>
            <strong className="text-ink">Como um app no celular.</strong> Instalem na tela inicial e recebam os lembretes das consultas e da semana nova.
          </span>
        </li>
      </ul>
    </div>
  );
}

/** Uma prévia do Início, como o casal vai ver. */
function Preview() {
  return (
    <div aria-hidden className="relative mx-auto lg:mx-0 max-w-sm">
      <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-br from-rosa-soft via-transparent to-azul-soft blur-2xl opacity-80" />
      <div className="relative rounded-[30px] bg-surface shadow-lift p-4 space-y-3.5">
        <div className="flex items-center gap-3">
          <BrandMark animated className="w-11 h-11" />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-rosa">2º trimestre · 5º mês</p>
            <p className="font-display text-[1.25rem] leading-tight text-ink">Do tamanho de uma manga</p>
          </div>
          <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">22 sem.</span>
        </div>
        <div className="flex gap-1 h-2">
          <span className="rounded-full bg-brand/45" style={{ flex: 10 }} />
          <span className="rounded-full bg-gradient-to-r from-brand from-60% to-surface-2 to-60%" style={{ flex: 14 }} />
          <span className="rounded-full bg-surface-2" style={{ flex: 9 }} />
          <span className="rounded-full bg-surface-2" style={{ flex: 4 }} />
        </div>
        <div className="rounded-2xl bg-surface-2/70 p-3 space-y-2">
          <p className="text-xs font-extrabold text-ink">Vocês dois hoje</p>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <span className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2">
              <span className="w-6 h-6 rounded-full bg-rosa text-white text-[11px] font-extrabold flex items-center justify-center">A</span> Ana: bem
            </span>
            <span className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2">
              <span className="w-6 h-6 rounded-full bg-azul text-white text-[11px] font-extrabold flex items-center justify-center">C</span> Caio: ótimo
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
            <Heart className="w-3.5 h-3.5 text-rosa fill-current" /> Caio mandou um abraço
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-verde-soft px-3 py-2.5">
          <Stethoscope className="w-5 h-5 text-verde-strong shrink-0" />
          <span className="text-[13px] leading-snug">
            <span className="block font-bold text-ink">Ultrassom morfológico</span>
            <span className="block text-ink-soft">Sexta, 9h · os dois vão</span>
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
          <Footprints className="w-3.5 h-3.5 text-coral-strong" /> Nesta semana: os primeiros chutes
        </p>
      </div>
    </div>
  );
}
