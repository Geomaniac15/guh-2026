// Client-side app lock state. Browser only.
// shortcut: a local privacy screen, not security. The flag lives in sessionStorage and the Face ID check is
// never verified by a server; the data itself is protected by Supabase auth + RLS. Upgrade: verify WebAuthn
// assertions server-side (challenge + stored public key) before releasing data.

const FLAG = 'runway-unlocked'
const credKey = (userId: string) => `runway-faceid:${userId}`

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback // private mode or blocked storage
  }
}

// Unlocked for this app session (cleared when the tab or home-screen app is closed)
export const isUnlocked = () => safe(() => sessionStorage.getItem(FLAG) === '1', false)
export const markUnlocked = () => safe(() => sessionStorage.setItem(FLAG, '1'), undefined)
export const lockApp = () => safe(() => sessionStorage.removeItem(FLAG), undefined)

// The Face ID credential id registered on this device, base64url
export const getCredentialId = (userId: string) => safe(() => localStorage.getItem(credKey(userId)), null)
export const saveCredentialId = (userId: string, id: string) => safe(() => localStorage.setItem(credKey(userId), id), undefined)
export const clearCredentialId = (userId: string) => safe(() => localStorage.removeItem(credKey(userId)), undefined)

export function toBase64Url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
