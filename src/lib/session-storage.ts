// Browser storage; returning null during static rendering avoids server-side sessions.
export const appStorage = {
  getItem(key: string): string | null {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};
