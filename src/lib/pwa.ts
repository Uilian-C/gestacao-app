import type { Tab } from '../types';

const TABS: Tab[] = ['inicio', 'agenda', 'diario', 'painel', 'consultas', 'parto'];

let linkedTab: Tab | null | undefined;

/** Aba pedida pelo link (/?aba=consultas), usada ao tocar numa notificação. Lê uma vez e limpa a URL. */
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
  return TABS.includes(tab) ? tab : null;
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
