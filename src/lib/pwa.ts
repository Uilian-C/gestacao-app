import type { Tab } from '../types';

const TABS: Tab[] = ['inicio', 'diario', 'agenda', 'cuidados', 'parto'];

// Atalhos de link que abrem uma parte de uma aba. Os nomes antigos (painel,
// consultas) continuam valendo: notificações já entregues ainda apontam para eles.
const SUBTABS: Record<string, { tab: Tab; view: string }> = {
  // Agenda: o que tem data (os avisos de consulta antigos apontam para "consultas").
  consultas: { tab: 'agenda', view: 'proximos' },
  agendados: { tab: 'agenda', view: 'proximos' },
  proximos: { tab: 'agenda', view: 'proximos' },
  tarefas: { tab: 'agenda', view: 'tarefas' },
  // A jornada do pré-natal (planejado × realizado) mora na Agenda.
  jornada: { tab: 'agenda', view: 'jornada' },
  painel: { tab: 'agenda', view: 'jornada' },
  // Cuidados: o que a equipe médica lê.
  duvidas: { tab: 'cuidados', view: 'duvidas' },
  exames: { tab: 'cuidados', view: 'exames' },
  resultados: { tab: 'cuidados', view: 'exames' },
  saude: { tab: 'cuidados', view: 'saude' },
};

let linkedTab: Tab | null | undefined;
let linkedView: string | null = null;

/** Aba pedida pelo link (/?aba=diario), usada ao tocar numa notificação. Lê uma vez e limpa a URL. */
export function takeTabFromUrl(): Tab | null {
  if (linkedTab === undefined) linkedTab = readTab();
  return linkedTab;
}

function readTab(): Tab | null {
  const url = new URL(window.location.href);
  const tab = url.searchParams.get('aba') as Tab | null;
  if (!tab) return null;
  url.searchParams.delete('aba');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  if (SUBTABS[tab]) {
    linkedView = SUBTABS[tab].view;
    return SUBTABS[tab].tab;
  }
  return TABS.includes(tab) ? tab : null;
}

/** Parte da aba pedida pelo link (/?aba=exames abre Cuidados em Exames). */
export function takeViewFromUrl(): string | null {
  takeTabFromUrl();
  return linkedView;
}

/** Registra o service worker (abre mais rápido e recebe notificações). */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker não registrado', err));
  });
}

// ---- Instalar o app (Android e Chrome no computador) ----
// O navegador avisa uma vez que o app pode ser instalado; guardamos o aviso
// para oferecer o botão "Instalar" na hora certa.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installEvent: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvent = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    emit();
  });
}

export const canInstall = () => installEvent !== null;

export function onInstallChange(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export async function promptInstall() {
  if (!installEvent) return false;
  await installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  emit();
  return outcome === 'accepted';
}

/** Aberto como app instalado (ícone na tela inicial), não numa aba do navegador. */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone ou iPad (no iPad novo o Safari se apresenta como Mac com tela de toque). */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Navegadores que abrem o app mas não entregam notificações nem oferecem a
 * instalação: o Edge no Android e os navegadores internos de redes sociais.
 * Devolve o nome para a mensagem, ou null se o navegador serve.
 */
export function limitedBrowser(ua = navigator.userAgent): string | null {
  if (/Instagram/.test(ua)) return 'o navegador do Instagram';
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return 'o navegador do Facebook';
  if (/Android/.test(ua) && /EdgA\//.test(ua)) return 'o Edge';
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return 'o navegador interno deste app';
  return null;
}

/**
 * Versão do iOS pelo navegador ([16, 4] para 16.4), ou null fora do iPhone/iPad.
 * O Safari mais novo congela o número (mostra 18.x mesmo no iOS 26), o que basta
 * para saber se passa de 16.4, a primeira versão com notificações para sites.
 */
export function iosVersion(ua = navigator.userAgent): [number, number] | null {
  const m = /(?:iPhone|iPad|iPod).*? OS (\d+)_(\d+)/.exec(ua);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** iOS antigo demais para notificações de sites (antes do 16.4). */
export function iosTooOld(ua = navigator.userAgent) {
  const v = iosVersion(ua);
  return !!v && (v[0] < 16 || (v[0] === 16 && v[1] < 4));
}

export const isAndroid = () => /Android/.test(navigator.userAgent);

/** Link que abre esta página direto no Chrome do Android. */
export function chromeIntentUrl(href = window.location.href) {
  const url = new URL(href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;end`;
}
