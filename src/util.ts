import { writable } from 'svelte/store';

export function sleep(ms: number) {
  const p = new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
  return p;
}

export function persisted<T>(key: string, initial: T) {
  let initialValue = initial;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { initialValue = JSON.parse(raw); } catch (e) { /* ignore */ }
    }
  }

  const store = writable<T>(initialValue);

  store.subscribe((val) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota 或 私有模式 */ }
    }
  });

  return store;
}

export const tg_oauth_data = persisted('oauth_data', null as null | {
  auth_date: number;
  first_name: string;
  id: number;
  photo_url?: string;
  username: string;
  hash: string;
});
