import { useSyncExternalStore } from 'react';
import { A11Y_STORAGE_KEY, DEFAULT_A11Y_SETTINGS, type A11ySettings } from './constants';

// Module-level store (not React context) so both the floating trigger and the
// panel — separate components that may mount/unmount independently — always
// read and write the same state, and so a vanilla-JS nav-menu button (see
// Navbar.astro) can toggle the panel via a CustomEvent without needing to be
// a React island itself.

let settings: A11ySettings = DEFAULT_A11Y_SETTINGS;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota/storage errors
  }
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
    if (raw) {
      settings = { ...DEFAULT_A11Y_SETTINGS, ...JSON.parse(raw) };
    } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settings = { ...DEFAULT_A11Y_SETTINGS, reduceMotion: true };
    }
    notify();
  } catch {
    // ignore malformed storage
  }
}

export function updateA11ySettings(updater: (prev: A11ySettings) => A11ySettings) {
  settings = updater(settings);
  persist();
  notify();
}

export function resetA11ySettings() {
  settings = DEFAULT_A11Y_SETTINGS;
  persist();
  notify();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return settings;
}

function getServerSnapshot() {
  return DEFAULT_A11Y_SETTINGS;
}

export function useA11ySettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

let panelOpen = false;
const panelListeners = new Set<() => void>();

function notifyPanel() {
  for (const listener of panelListeners) listener();
}

export function openA11yPanel() {
  panelOpen = true;
  notifyPanel();
}

export function toggleA11yPanel() {
  panelOpen = !panelOpen;
  notifyPanel();
}

export function closeA11yPanel() {
  panelOpen = false;
  notifyPanel();
}

function subscribePanel(listener: () => void) {
  panelListeners.add(listener);
  return () => panelListeners.delete(listener);
}

function getPanelSnapshot() {
  return panelOpen;
}

function getPanelServerSnapshot() {
  return false;
}

export function useA11yPanelOpen() {
  return useSyncExternalStore(subscribePanel, getPanelSnapshot, getPanelServerSnapshot);
}
