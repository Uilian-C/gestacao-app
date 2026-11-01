import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { setSound, soundOn, tumtum } from '../lib/feel';

/** "Som do tum-tum": as duas batidas baixinhas ao abraçar, guardar e fechar o dia. */
export default function SoundToggle() {
  const [on, setOn] = useState(soundOn);
  const flip = () => {
    setSound(!on);
    setOn(!on);
    if (!on) window.setTimeout(tumtum, 30);
  };
  return (
    <section className="bg-surface shadow-soft rounded-[24px] p-5">
      <label className="flex items-center gap-3 cursor-pointer">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-rosa-soft text-rosa-strong flex items-center justify-center" aria-hidden>
          <HeartPulse className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-ink">Som do tum-tum</span>
          <span className="block text-[12.5px] text-ink-soft leading-snug">Duas batidas baixinhas ao abraçar, guardar uma lembrança e fechar o dia.</span>
        </span>
        <input type="checkbox" role="switch" checked={on} onChange={flip} className="w-5 h-5 accent-[var(--color-rosa)]" aria-label="Som do tum-tum" />
      </label>
    </section>
  );
}
