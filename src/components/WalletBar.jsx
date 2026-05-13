import { DEFAULT_WALLET, MIN_BET } from '../game/gameLogic.js'

export default function WalletBar({ wallet, onReset, handHistory }) {
  const wins = handHistory.filter(h => h.outcome === 'WIN').length
  const losses = handHistory.filter(h => h.outcome === 'LOSS').length
  const pushes = handHistory.filter(h => h.outcome === 'PUSH').length
  const total = wins + losses + pushes

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
      <button className="btn-reset" onClick={onReset} title="Reset wallet">↺</button>
    </div>
  )
}
