// sama kayak di portfolio: fallback ke memori kalau localStorage diblok (Safari private)
const memory = {}

const available = (() => {
  try {
    const k = '__rc_test__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
})()

export const safeStorage = {
  getItem: (key) => (available ? window.localStorage.getItem(key) : memory[key] ?? null),
  setItem: (key, value) => {
    if (available) window.localStorage.setItem(key, value)
    else memory[key] = String(value)
  },
  removeItem: (key) => {
    if (available) window.localStorage.removeItem(key)
    else delete memory[key]
  },
}

const SAVE_KEY = 'rumah-cipu:save:v1'

export const loadSave = () => {
  try {
    return JSON.parse(safeStorage.getItem(SAVE_KEY)) || null
  } catch {
    return null
  }
}

export const writeSave = (data) => {
  safeStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export const clearSave = () => safeStorage.removeItem(SAVE_KEY)
