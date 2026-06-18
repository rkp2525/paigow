import { createInitialState, DEFAULT_WALLET } from '../game/gameLogic.js'

const STORAGE_KEY = 'paigow_session'
const ALLTIME_KEY = 'paigow_alltime'
const DECK_COLOR_KEY = 'paigow_deck_color'

export const DEFAULT_DECK_COLOR = '#2d2d8c'

export function loadDeckColor() {
  try {
    return localStorage.getItem(DECK_COLOR_KEY) || DEFAULT_DECK_COLOR
  } catch {
    return DEFAULT_DECK_COLOR
  }
}

export function saveDeckColor(color) {
  try {
    localStorage.setItem(DECK_COLOR_KEY, color)
  } catch {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      wallet: typeof data.wallet === 'number' ? data.wallet : DEFAULT_WALLET,
      handHistory: Array.isArray(data.handHistory) ? data.handHistory : [],
    }
  } catch {
    return null
  }
}

export function saveSession(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      wallet: state.wallet,
      handHistory: state.handHistory,
    }))
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function loadAllTimeHistory() {
  try {
    const raw = localStorage.getItem(ALLTIME_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function appendAllTimeEntry(entry) {
  try {
    const history = loadAllTimeHistory()
    localStorage.setItem(ALLTIME_KEY, JSON.stringify([entry, ...history]))
  } catch {}
}

export function initState(walletOverride) {
  const saved = loadSession()
  const wallet = walletOverride ?? saved?.wallet ?? DEFAULT_WALLET
  const base = createInitialState(wallet)
  // When walletOverride is provided it's a manual reset — start with empty session history
  const handHistory = walletOverride != null ? [] : (saved?.handHistory ?? [])
  return { ...base, handHistory }
}
