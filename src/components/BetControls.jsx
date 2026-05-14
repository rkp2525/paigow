import { MIN_BET, BET_INCREMENT, SIDE_BET_AMOUNT } from '../game/gameLogic.js'

const CHIP_AMOUNTS = [5, 10, 25, 50, 100]

export default function BetControls({ bet, wallet, paiGowSideBet, fortuneSideBet, onBetChange, onSideBetToggle, onDeal }) {
  function adjustBet(delta) {
    const next = Math.max(MIN_BET, Math.min(wallet, bet + delta))
    onBetChange(Math.round(next / BET_INCREMENT) * BET_INCREMENT)
  }

  function setChip(amount) {
    const clamped = Math.max(MIN_BET, Math.min(wallet, amount))
    onBetChange(clamped)
  }

  const sideTotal = (paiGowSideBet ? SIDE_BET_AMOUNT : 0) + (fortuneSideBet ? SIDE_BET_AMOUNT : 0)
  const canDeal = bet >= MIN_BET && (bet + sideTotal) <= wallet
  const canAffordSide = wallet >= bet + sideTotal + SIDE_BET_AMOUNT

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

      <div className="side-bet-row">
        <button
          className={`btn-side-bet${paiGowSideBet ? ' side-bet-active' : ''}`}
          onClick={() => onSideBetToggle('paiGow')}
          disabled={!paiGowSideBet && !canAffordSide}
          title="Pays 3:1–100:1 when your 7 cards are all singletons"
        >
          Pai Gow ${SIDE_BET_AMOUNT}
        </button>
        <button
          className={`btn-side-bet${fortuneSideBet ? ' side-bet-active' : ''}`}
          onClick={() => onSideBetToggle('fortune')}
          disabled={!fortuneSideBet && !canAffordSide}
          title="Pays 2:1–400:1 for 3-of-a-kind or better from your 7 cards"
        >
          Fortune ${SIDE_BET_AMOUNT}
        </button>
      </div>

      <button className="btn-deal" onClick={onDeal} disabled={!canDeal}>
        Deal
      </button>
    </div>
  )
}
