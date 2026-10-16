import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { inputClass } from './styles';

/**
 * Campo de endereço com sugestões enquanto digita (Google Maps quando há chave
 * configurada; senão OpenStreetMap). Sem sugestão, vale o texto digitado.
 */
export default function AddressInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || q === picked.current) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : { suggestions: [] }))
        .then((d: { suggestions: Array<{ label: string }> }) => {
          setSuggestions(d.suggestions.map(s => s.label));
          setOpen(true);
        })
        .catch(() => undefined);
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const visible = open && query.trim().length >= 3 && suggestions.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        className={inputClass}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${id}-lista`}
        onChange={e => {
          onChange(e.target.value);
          setQuery(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
      />
      {visible && (
        <ul id={`${id}-lista`} role="listbox" className="absolute z-20 mt-1 w-full rounded-2xl bg-surface shadow-lift p-1 max-h-64 overflow-auto">
          {suggestions.map(s => (
            <li key={s} role="option" aria-selected={s === value}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  picked.current = s;
                  onChange(s);
                  setQuery(s);
                  setOpen(false);
                }}
                className="w-full text-left flex items-start gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2"
              >
                <MapPin className="w-4 h-4 text-ink-mute shrink-0 mt-0.5" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
