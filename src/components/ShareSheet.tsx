import { useEffect, useState } from 'react';
import { Download, Link2, Loader2, Share2 } from 'lucide-react';
import { drawCard, shareImage, type CardContent, type CardFormat, type ShareKind } from '../lib/shareCard';
import Sheet from './Sheet';
import { Button, Segmented } from './ui';

// Compartilhar: a prévia do cartão como vai sair, no formato de stories e
// status (9:16) ou de post (4:5), e dois caminhos: o compartilhar do celular
// (Instagram, WhatsApp...) ou salvar a imagem.

export interface ShareRequest {
  card: CardContent;
  kind: ShareKind;
  fileName: string;
  /** O texto que vai junto (com o link do bolão, por exemplo). */
  text?: string;
  /** Um link para mandar sozinho, sem a imagem ("Só o link"). */
  link?: string;
}

const FORMAT_KEY = 'tumtum:formato-cartao';

function savedFormat(): CardFormat {
  try {
    return localStorage.getItem(FORMAT_KEY) === 'post' ? 'post' : 'story';
  } catch {
    return 'story';
  }
}

export default function ShareSheet({ request, onClose, onDone }: { request: ShareRequest; onClose: () => void; onDone: (kind: ShareKind, how: 'shared' | 'downloaded') => void }) {
  const [format, setFormat] = useState<CardFormat>(savedFormat);
  const [image, setImage] = useState<{ format: CardFormat; blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    drawCard(request.card, format)
      .then(blob => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setImage({ format, blob, url });
      })
      .catch(err => {
        console.error(err);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [request.card, format]);

  const pick = (f: CardFormat) => {
    setFormat(f);
    try {
      localStorage.setItem(FORMAT_KEY, f);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };
  const ready = image?.format === format ? image : null;
  const send = async (download: boolean) => {
    if (!ready) return;
    setSending(true);
    try {
      const how = await shareImage(ready.blob, `${request.fileName}-${format === 'story' ? 'stories' : 'post'}`, download, request.text);
      if (how !== 'cancelled') onDone(request.kind, how);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet title="Compartilhar" subtitle="Pronto para os stories, o status do WhatsApp ou o feed." icon={<Share2 />} onClose={onClose}>
      <div className="space-y-4">
        <Segmented
          value={format}
          onChange={pick}
          label="Formato"
          full
          options={[
            { value: 'story', label: 'Stories e status' },
            { value: 'post', label: 'Post' },
          ]}
        />
        <div className={`mx-auto overflow-hidden rounded-[22px] bg-surface-2 shadow-soft ${format === 'story' ? 'aspect-[9/16] w-[min(62vw,250px)]' : 'aspect-[4/5] w-[min(76vw,300px)]'}`}>
          {ready ? (
            <img src={ready.url} alt="Prévia do cartão para compartilhar" className="block w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-mute" role="status" aria-label={failed ? 'Não deu para gerar a imagem' : 'Preparando a imagem'}>
              {failed ? <p className="px-6 text-center text-sm">Não deu para gerar a imagem agora.</p> : <Loader2 className="w-6 h-6 animate-spin" />}
            </div>
          )}
        </div>
        <p className="text-center text-[12.5px] text-ink-mute">A imagem leva só o que aparece nela, e nada sai sem o seu toque.</p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => void send(false)} disabled={!ready || sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Share2 />} Compartilhar
          </Button>
          <Button tone="soft" onClick={() => void send(true)} disabled={!ready || sending}>
            <Download /> Salvar
          </Button>
        </div>
        {request.link && (
          <button
            type="button"
            onClick={async () => {
              const text = `${request.text ?? ''}`.trim() || request.link!;
              try {
                if (navigator.share) await navigator.share({ text });
                else await navigator.clipboard.writeText(text);
                onDone(request.kind, 'shared');
              } catch {
                /* cancelou: tudo bem */
              }
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[13.5px] font-extrabold text-ink-soft"
          >
            <Link2 className="w-4 h-4" /> Mandar só o link
          </button>
        )}
      </div>
    </Sheet>
  );
}
