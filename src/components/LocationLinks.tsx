import { Car, MapPin, Navigation } from 'lucide-react';
import { googleMapsUrl, uberUrl, wazeUrl } from '../lib/directions';

const chip = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-soft hover:text-brand transition [&_svg]:w-3.5 [&_svg]:h-3.5';

const mini = 'w-8 h-8 shrink-0 rounded-full bg-surface flex items-center justify-center text-ink-soft shadow-soft hover:text-brand transition [&_svg]:w-4 [&_svg]:h-4';

/** Endereço da consulta com atalhos para Maps, Waze e Uber (em uma linha só, na versão compacta). */
export default function LocationLinks({ address, compact = false }: { address: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <a href={googleMapsUrl(address)} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-brand">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate underline decoration-line underline-offset-4">{address}</span>
        </a>
        <span className="flex gap-1.5" aria-label="Como chegar">
          <a href={googleMapsUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Abrir no Maps" className={mini}>
            <MapPin />
          </a>
          <a href={wazeUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Abrir no Waze" className={mini}>
            <Navigation />
          </a>
          <a href={uberUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Pedir um Uber" className={mini}>
            <Car />
          </a>
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <a href={googleMapsUrl(address)} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-soft flex items-start gap-1.5 hover:text-brand">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="underline decoration-line underline-offset-4">{address}</span>
      </a>
      <div className="flex flex-wrap gap-2" aria-label="Como chegar">
        <a href={googleMapsUrl(address)} target="_blank" rel="noopener noreferrer" className={chip}>
          <MapPin /> Maps
        </a>
        <a href={wazeUrl(address)} target="_blank" rel="noopener noreferrer" className={chip}>
          <Navigation /> Waze
        </a>
        <a href={uberUrl(address)} target="_blank" rel="noopener noreferrer" className={chip}>
          <Car /> Uber
        </a>
      </div>
    </div>
  );
}
