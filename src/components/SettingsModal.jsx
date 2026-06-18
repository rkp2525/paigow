import { useState } from 'react'
import { DEFAULT_WALLET, MIN_BET, SIDE_BET_AMOUNT } from '../game/gameLogic.js'
import BankrollGraph from './BankrollGraph.jsx'

function computeWalletBefore(entry) {
  const mainChange =
    entry.outcome === 'WIN' ? entry.bet :
    entry.outcome === 'LOSS' ? -entry.bet : 0
  let sideChange = 0
  if (entry.paiGowSidePlaced) {
    sideChange += entry.paiGowSideWon
      ? SIDE_BET_AMOUNT * entry.paiGowSideMultiplier
      : -SIDE_BET_AMOUNT
  }
  if (entry.fortuneSidePlaced) {
    sideChange += entry.fortuneSideWon
      ? SIDE_BET_AMOUNT * entry.fortuneSideMultiplier
      : -SIDE_BET_AMOUNT
  }
  return entry.walletAfter - mainChange - sideChange
}

export default function SettingsModal({ wallet, allTimeHistory, handHistory = [], onSave, onCancel }) {
  const [value, setValue] = useState(String(wallet))

  // handHistory is newest-first; chart it oldest-first as a running bankroll.
  const oldestFirst = [...handHistory].reverse()
  const balances = oldestFirst.length > 0
    ? [computeWalletBefore(oldestFirst[0]), ...oldestFirst.map(h => h.walletAfter)]
    : []

  function handleSave() {
    const n = parseInt(value, 10)
    if (isNaN(n) || n < MIN_BET) return
    onSave(n)
  }

  const wins = allTimeHistory.filter(h => h.outcome === 'WIN').length
  const losses = allTimeHistory.filter(h => h.outcome === 'LOSS').length
  const pushes = allTimeHistory.filter(h => h.outcome === 'PUSH').length
  const total = wins + losses + pushes

  // Side bet stats
  function sideBetStats(wonKey, placedKey, multiplierKey) {
    const qualified = allTimeHistory.filter(h => h[wonKey]).length
    const placed = allTimeHistory.filter(h => h[placedKey])
    const placedWon = placed.filter(h => h[wonKey])
    const netGain = placed.reduce((sum, h) => {
      if (h[wonKey]) return sum + SIDE_BET_AMOUNT * (h[multiplierKey] - 1)
      return sum - SIDE_BET_AMOUNT
    }, 0)
    return { qualified, total, placedCount: placed.length, placedWon: placedWon.length, netGain }
  }

  const pgStats = sideBetStats('paiGowSideWon', 'paiGowSidePlaced', 'paiGowSideMultiplier')
  const ftStats = sideBetStats('fortuneSideWon', 'fortuneSidePlaced', 'fortuneSideMultiplier')

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {total > 0 && (
          <div className="alltime-stats">
            <div className="alltime-title">All-Time Record</div>
            <div className="alltime-row">
              <span className="stat-win">{wins}W</span>
              <span className="stat-push">{pushes}P</span>
              <span className="stat-loss">{losses}L</span>
              <span className="alltime-total">({total} hands)</span>
            </div>
          </div>
        )}

        {balances.length >= 2 && <BankrollGraph balances={balances} />}

        {total > 0 && (pgStats.qualified > 0 || pgStats.placedCount > 0 || ftStats.qualified > 0 || ftStats.placedCount > 0) && (
          <div className="side-bet-stats">
            <div className="alltime-title">Side Bet History</div>
            <SideBetStatRow label="Pai Gow" stats={pgStats} />
            <SideBetStatRow label="Fortune" stats={ftStats} />
          </div>
        )}

        <h2>Reset Wallet</h2>
        <p>Set your starting balance:</p>
        <div className="modal-presets">
          {[100, 250, 500, 1000, 2500].map(v => (
            <button key={v} className={`preset-btn${parseInt(value) === v ? ' preset-active' : ''}`}
              onClick={() => setValue(String(v))}>
              ${v}
            </button>
          ))}
        </div>
        <input
          type="number"
          className="modal-input"
          value={value}
          min={MIN_BET}
          step={5}
          onChange={e => setValue(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={handleSave}>Set Balance</button>
        </div>
      </div>
    </div>
  )
}

function SideBetStatRow({ label, stats }) {
  const { qualified, total, placedCount, placedWon, netGain } = stats
  if (total === 0) return null
  const qualRate = total > 0 ? Math.round(100 * qualified / total) : 0
  return (
    <div className="sbs-row">
      <span className="sbs-label">{label}</span>
      <span className="sbs-qual">Qualified {qualified}/{total} ({qualRate}%)</span>
      {placedCount > 0 && (
        <span className={`sbs-net ${netGain >= 0 ? 'sbs-net-pos' : 'sbs-net-neg'}`}>
          Bet {placedCount}×, won {placedWon} — net {netGain >= 0 ? '+' : ''}${netGain}
        </span>
      )}
    </div>
  )
}
