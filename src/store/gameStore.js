import { createInitialState, DEFAULT_WALLET } from '../game/gameLogic.js'

const STORAGE_KEY = 'paigow_session'

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Only restore wallet and hand history — don't restore mid-round state
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
  } catch {
    // localStorage unavailable — silently continue
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable — silently continue
  }
}

export function initState(walletOverride) {
  const saved = loadSession()
  const wallet = walletOverride ?? saved?.wallet ?? DEFAULT_WALLET
  const base = createInitialState(wallet)
  return { ...base, handHistory: saved?.handHistory ?? [] }
}
