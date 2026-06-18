import { DEFAULT_WALLET, MIN_BET } from '../game/gameLogic.js'

// Current run of consecutive WINs or LOSSes, newest first.
// Pushes neither extend nor break a streak.
export function currentStreak(handHistory) {
  let kind = null
  let count = 0
  for (const h of handHistory) {
    if (h.outcome === 'PUSH') continue
    if (kind === null) kind = h.outcome
    if (h.outcome !== kind) break
    count++
  }
  return count > 0 ? { kind, count } : null
}

export default function WalletBar({ wallet, onReset, handHistory }) {
  const wins = handHistory.filter(h => h.outcome === 'WIN').length
  const losses = handHistory.filter(h => h.outcome === 'LOSS').length
  const pushes = handHistory.filter(h => h.outcome === 'PUSH').length
  const total = wins + losses + pushes
  const streak = currentStreak(handHistory)
  const showStreak = streak !== null && streak.count >= 2

  return (
    <div className="wallet-bar">
      <div className="wallet-amount">
        <span className="wallet-label">Wallet</span>
        <span className="wallet-value">${wallet.toLocaleString()}</span>
      </div>
      {total > 0 && (
        <div className="wallet-stats">
          <span className="stat-win">{wins}W</span>
          <span className="stat-push">{pushes}P</span>
          <span className="stat-loss">{losses}L</span>
        </div>
      )}
      {showStreak && (
        <div
          className={`streak-badge ${streak.kind === 'WIN' ? 'streak-hot' : 'streak-cold'}`}
          title={`${streak.count} ${streak.kind === 'WIN' ? 'wins' : 'losses'} in a row`}
        >
          {streak.kind === 'WIN' ? '🔥' : '🧊'} {streak.count}
        </div>
      )}
      <button className="btn-reset" onClick={onReset} title="Reset wallet">↺</button>
    </div>
  )
}
