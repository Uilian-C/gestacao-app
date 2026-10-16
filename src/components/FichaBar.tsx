import { useState } from 'react';
import { ChevronDown, ClipboardList, Pencil } from 'lucide-react';
import { BLOOD_TYPES, buildFicha, fichaSummary, missingFicha, type FichaItem } from '../lib/ficha';
import type { HealthMetric, PregnancyProfile } from '../types';
import { inputClass } from './styles';
import { Button, Field } from './ui';

export interface FichaInput {
  motherName: string | null;
  motherBirthDate: string | null;
  bloodType: string | null;
  gestations: number | null;
  births: number | null;
  abortions: number | null;
  cesareans: number | null;
  preWeightKg: number | null;
  heightCm: number | null;
  allergies: string | null;
  medications: string | null;
  conditions: string | null;
}

interface Props {
  profile: PregnancyProfile & { dumDate: string };
  metrics: HealthMetric[];
  busy: boolean;
  onSave: (input: FichaInput) => Promise<boolean>;
}

/** Cabeçalho de prontuário: o mesmo resumo em todas as telas, com a ficha completa a um toque. */
export default function FichaBar({ profile, metrics, busy, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const summary = fichaSummary(profile);
  const items = buildFicha(profile, metrics);
  const missing = missingFicha(items);

  return (
    <div className="no-print max-w-5xl mx-auto px-4 md:px-6">
      <div className="rounded-2xl border border-line bg-surface">
        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        >
          <ClipboardList className="w-4 h-4 text-brand shrink-0" />
          <span className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 text-sm">
            {summary.map((s, i) => (
              <span key={i} className={`tabular whitespace-nowrap rounded-full px-2 py-0.5 ${i === 0 ? 'font-bold text-ink bg-brand-soft' : 'text-ink-soft bg-surface-2'}`}>
                {s}
              </span>
            ))}
            {missing.length > 0 && <span className="text-xs font-semibold text-warm whitespace-nowrap px-1">completar ficha</span>}
          </span>
          <ChevronDown className={`w-4 h-4 text-ink-mute shrink-0 transition ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="border-t border-line px-4 py-4 space-y-4">
            {!editing ? (
              <>
                <FichaGrid items={items} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-mute">
                    {missing.length ? `Falta preencher: ${missing.join(', ').toLowerCase()}.` : 'Ficha completa. Ela aparece no topo de todo resumo de consulta.'}
                  </p>
                  {profile.fichaAvailable ? (
                    <Button tone="soft" onClick={() => setEditing(true)} className="!px-4 !py-2">
                      <Pencil className="w-4 h-4" /> Editar ficha
                    </Button>
                  ) : (
                    <p className="text-xs text-warn bg-warn-soft rounded-xl px-3 py-2">
                      Para editar, rodem a migração <code>db/migrations/003_ficha_gestante.sql</code> no Neon.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <FichaForm
                profile={profile}
                busy={busy}
                onCancel={() => setEditing(false)}
                onSave={async input => {
                  if (await onSave(input)) setEditing(false);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function FichaGrid({ items, compact = false }: { items: FichaItem[]; compact?: boolean }) {
  return (
    <dl className={`grid gap-x-6 ${compact ? 'grid-cols-2 sm:grid-cols-3 gap-y-2.5' : 'grid-cols-2 lg:grid-cols-3 gap-y-3'}`}>
      {items.map(i => (
        <div key={i.key} className="min-w-0">
          <dt className="text-xs text-ink-mute">{i.label}</dt>
          <dd className={`text-sm ${i.value ? (i.attention ? 'font-bold text-alert' : 'font-semibold text-ink') : 'text-ink-mute italic'}`}>
            {i.value ?? 'não informado'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FichaForm({ profile, busy, onSave, onCancel }: { profile: PregnancyProfile; busy: boolean; onSave: (i: FichaInput) => void; onCancel: () => void }) {
  const str = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));
  const [f, setF] = useState({
    motherName: profile.motherName ?? '',
    motherBirthDate: profile.motherBirthDate ?? '',
    bloodType: profile.bloodType ?? '',
    gestations: str(profile.gestations),
    births: str(profile.births),
    abortions: str(profile.abortions),
    cesareans: str(profile.cesareans),
    preWeightKg: str(profile.preWeightKg),
    heightCm: str(profile.heightCm),
    allergies: profile.allergies ?? '',
    medications: profile.medications ?? '',
    conditions: profile.conditions ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(prev => ({ ...prev, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const int = (v: string) => (v.trim() === '' ? null : Number(v));
    const dec = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
    const input: FichaInput = {
      motherName: f.motherName.trim() || null,
      motherBirthDate: f.motherBirthDate || null,
      bloodType: f.bloodType || null,
      gestations: int(f.gestations),
      births: int(f.births),
      abortions: int(f.abortions),
      cesareans: int(f.cesareans),
      preWeightKg: dec(f.preWeightKg),
      heightCm: dec(f.heightCm),
      allergies: f.allergies.trim() || null,
      medications: f.medications.trim() || null,
      conditions: f.conditions.trim() || null,
    };
    const counts = [input.gestations, input.births, input.abortions, input.cesareans];
    if (counts.some(n => n !== null && (!Number.isInteger(n) || n < 0 || n > 20))) return setError('Use números inteiros nas gestações, partos, perdas e cesáreas.');
    if (input.gestations !== null && (input.births ?? 0) + (input.abortions ?? 0) >= input.gestations) return setError('Partos e perdas anteriores devem somar menos que o total de gestações (que inclui a atual).');
    if (input.cesareans !== null && input.cesareans > (input.births ?? 0)) return setError('O número de cesáreas não pode ser maior que o de partos.');
    if (input.preWeightKg !== null && !(input.preWeightKg >= 30 && input.preWeightKg <= 250)) return setError('Peso antes da gravidez em kg, por exemplo 60.');
    if (input.heightCm !== null && !(input.heightCm >= 120 && input.heightCm <= 220)) return setError('Altura em centímetros, por exemplo 165.');
    setError(null);
    onSave(input);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Nome da gestante" htmlFor="f-nome">
          <input id="f-nome" className={inputClass} value={f.motherName} onChange={set('motherName')} />
        </Field>
        <Field label="Data de nascimento" htmlFor="f-nasc">
          <input id="f-nasc" type="date" className={inputClass} value={f.motherBirthDate} onChange={set('motherBirthDate')} />
        </Field>
        <Field label="Tipo sanguíneo" htmlFor="f-sangue">
          <select id="f-sangue" className={inputClass} value={f.bloodType} onChange={set('bloodType')}>
            <option value="">Não sei</option>
            {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Gestações (com a atual)" htmlFor="f-g">
          <input id="f-g" inputMode="numeric" className={inputClass} placeholder="ex.: 1" value={f.gestations} onChange={set('gestations')} />
        </Field>
        <Field label="Partos anteriores" htmlFor="f-p">
          <input id="f-p" inputMode="numeric" className={inputClass} placeholder="ex.: 0" value={f.births} onChange={set('births')} />
        </Field>
        <Field label="Cesáreas" htmlFor="f-c">
          <input id="f-c" inputMode="numeric" className={inputClass} placeholder="ex.: 0" value={f.cesareans} onChange={set('cesareans')} />
        </Field>
        <Field label="Perdas anteriores" htmlFor="f-a">
          <input id="f-a" inputMode="numeric" className={inputClass} placeholder="ex.: 0" value={f.abortions} onChange={set('abortions')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Peso antes da gravidez (kg)" htmlFor="f-peso">
          <input id="f-peso" inputMode="decimal" className={inputClass} placeholder="ex.: 60" value={f.preWeightKg} onChange={set('preWeightKg')} />
        </Field>
        <Field label="Altura (cm)" htmlFor="f-alt">
          <input id="f-alt" inputMode="numeric" className={inputClass} placeholder="ex.: 165" value={f.heightCm} onChange={set('heightCm')} />
        </Field>
      </div>
      <Field label="Alergias" htmlFor="f-alergias" hint='Escreva "nenhuma" se não houver: o profissional sabe que foi perguntado.'>
        <input id="f-alergias" className={inputClass} placeholder="ex.: dipirona, camarão" value={f.allergies} onChange={set('allergies')} />
      </Field>
      <Field label="Medicações e suplementos em uso" htmlFor="f-med">
        <input id="f-med" className={inputClass} placeholder="ex.: ácido fólico, sulfato ferroso" value={f.medications} onChange={set('medications')} />
      </Field>
      <Field label="Condições prévias" htmlFor="f-cond" hint="Hipertensão, diabetes, tireoide, asma, cirurgias... ou nenhuma.">
        <input id="f-cond" className={inputClass} value={f.conditions} onChange={set('conditions')} />
      </Field>
      {error && <p className="text-sm font-semibold text-alert" role="alert">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button tone="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={busy}>Salvar ficha</Button>
      </div>
    </form>
  );
}
