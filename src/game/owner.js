// Akses pemilik rumah (Ferdy).
// Kunci pemilik -> PBKDF2 -> seed Ed25519. Yang disimpan di kode cuma public key,
// jadi tanda "pemilik rumah" nggak bisa dipalsuin walau kodenya dibaca orang:
// tiap pemain lain memverifikasi tanda tangan pakai public key di bawah ini.

import { safeStorage } from '../utils/storage'

export const OWNER_NAME = 'Ferdy'
const OWNER_PUB = 'Uvy7kFwQTOKWGeX086xTMPV198bMZaJEOH2bEn3cxdQ'
const SALT = 'rumah-cipu/pemilik/v1'
const STORE_KEY = 'rumah-cipu:pemilik'

const b64u = {
  enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => {
    const str = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
    return Uint8Array.from(str, (c) => c.charCodeAt(0))
  },
}

const PKCS8_PREFIX = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20])

export const ownerRouteActive = () => location.hash.replace('#', '').toLowerCase() === 'ferdy'

const importSeed = async (seed) => {
  const der = new Uint8Array(PKCS8_PREFIX.length + 32)
  der.set(PKCS8_PREFIX)
  der.set(seed, PKCS8_PREFIX.length)
  return crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign'])
}

let pubKeyPromise = null
const ownerPublicKey = () => {
  pubKeyPromise ||= crypto.subtle.importKey('raw', b64u.dec(OWNER_PUB), { name: 'Ed25519' }, false, ['verify'])
  return pubKeyPromise
}

const message = (peerId, ts) => new TextEncoder().encode(`rumah-cipu|pemilik|${peerId}|${ts}`)

// cek kunci yang diketik; kalau cocok, seed disimpan di perangkat ini
export async function unlockOwner(passphrase, remember = true) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.trim().normalize('NFKC')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(SALT), iterations: 210000 }, base, 256)
  const seed = new Uint8Array(bits)
  const key = await importSeed(seed)
  if (!(await matchesOwner(key))) return null
  if (remember) safeStorage.setItem(STORE_KEY, b64u.enc(seed))
  return key
}

// pastikan kunci ini memang pasangan public key pemilik
const matchesOwner = async (key) => {
  const sig = await crypto.subtle.sign('Ed25519', key, message('cek', 0))
  return crypto.subtle.verify('Ed25519', await ownerPublicKey(), sig, message('cek', 0))
}

export async function restoreOwner() {
  const s = safeStorage.getItem(STORE_KEY)
  if (!s) return null
  try {
    const key = await importSeed(b64u.dec(s))
    // kunci lama (sebelum diganti) -> buang, minta ketik ulang
    if (!(await matchesOwner(key))) {
      safeStorage.removeItem(STORE_KEY)
      return null
    }
    return key
  } catch {
    return null
  }
}

export const forgetOwner = () => safeStorage.removeItem(STORE_KEY)

export async function signOwner(key, peerId) {
  const ts = Date.now()
  const sig = await crypto.subtle.sign('Ed25519', key, message(peerId, ts))
  return { ts, sig: b64u.enc(sig) }
}

export async function verifyOwner(peerId, proof) {
  if (!proof || typeof proof.sig !== 'string' || typeof proof.ts !== 'number') return false
  try {
    return await crypto.subtle.verify('Ed25519', await ownerPublicKey(), b64u.dec(proof.sig), message(peerId, proof.ts))
  } catch {
    return false
  }
}

// nama "Ferdy" khusus pemilik; tamu yang pakai nama itu dikasih akhiran
export const guestName = (name) => {
  const clean = String(name || '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .trim()
    .slice(0, 16)
  if (!clean) return 'Tamu'
  return /ferdy/i.test(clean) ? `${clean} (tamu)` : clean
}
