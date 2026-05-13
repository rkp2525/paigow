import { MIN_BET, BET_INCREMENT } from '../game/gameLogic.js'

const CHIP_AMOUNTS = [5, 10, 25, 50, 100]

export default function BetControls({ bet, wallet, onBetChange, onDeal }) {
  function adjustBet(delta) {
    const next = Math.max(MIN_BET, Math.min(wallet, bet + delta))
    onBetChange(Math.round(next / BET_INCREMENT) * BET_INCREMENT)
  }

  function setChip(amount) {
    const clamped = Math.max(MIN_BET, Math.min(wallet, amount))
    onBetChange(clamped)
  }

  const canDeal = bet >= MIN_BET && bet <= wallet

  return (
    <div className="bet-controls">
      <div className="bet-row">
        <button className="btn-adjust" onClick={() => adjustBet(-BET_INCREMENT)} disabled={bet <= MIN_BET}>−</button>
        <div className="bet-display">
          <span className="bet-label">Bet</span>
          <span className="bet-amount">${bet}</span>
        </div>
        <button className="btn-adjust" onClick={() => adjustBet(BET_INCREMENT)} disabled={bet + BET_INCREMENT > wallet}>+</button>
      </div>

      <div className="chip-row">
        {CHIP_AMOUNTS.map(a => (
          <button
            key={a}
            className={`chip${bet === a ? ' chip-active' : ''}`}
            onClick={() => setChip(a)}
            disabled={a > wallet}
          >
            ${a}
          </button>
        ))}
      </div>

      <button className="btn-deal" onClick={onDeal} disabled={!canDeal}>
        Deal
      </button>
    </div>
  )
}
