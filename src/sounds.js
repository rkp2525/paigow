const MUTE_KEY = 'paigow_muted'

let audioCtx = null
function getContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

let muted = loadMuted()

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {}
}

// Synthesize a single tone via the Web Audio API — no audio assets to ship,
// keeps the bundle dependency-free like the rest of the game's effects.
function tone(freq, startOffset, duration, { type = 'sine', gain = 0.15 } = {}) {
  if (muted) return
  const ctx = getContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const start = ctx.currentTime + startOffset
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playDeal() {
  tone(320, 0, 0.06, { type: 'square', gain: 0.08 })
  tone(420, 0.05, 0.06, { type: 'square', gain: 0.08 })
}

export function playChip() {
  tone(700, 0, 0.05, { type: 'triangle', gain: 0.1 })
}

export function playWin() {
  tone(523.25, 0, 0.15, { gain: 0.15 })    // C5
  tone(659.25, 0.1, 0.15, { gain: 0.15 })  // E5
  tone(783.99, 0.2, 0.25, { gain: 0.18 })  // G5
}

export function playLoss() {
  tone(220, 0, 0.2, { type: 'sawtooth', gain: 0.12 })
  tone(164.81, 0.15, 0.3, { type: 'sawtooth', gain: 0.12 })
}

export function playPush() {
  tone(440, 0, 0.12, { type: 'triangle', gain: 0.12 })
  tone(440, 0.15, 0.12, { type: 'triangle', gain: 0.12 })
}
