import { useState } from 'react'
import {
  MIN_BET, BET_INCREMENT, SIDE_BET_AMOUNT,
  PAI_GOW_PAY, PAI_GOW_DEFAULT_PAY, FORTUNE_PAY, ROYAL_FLUSH_PAY,
} from '../game/gameLogic.js'
import { HR, HR_NAMES } from '../game/handEval.js'

const CHIP_AMOUNTS = [5, 10, 25, 50, 100]

const BET_PRESETS = [
  { key: 'min', label: 'Min' },
  { key: 'half', label: 'Half' },
  { key: 'max', label: 'Max' },
]

// Built from the same payout constants the game pays out with, so the table
// can never drift from the actual odds.
const PAI_GOW_ROWS = [
  { label: '9-high or lower', mult: PAI_GOW_DEFAULT_PAY },
  { label: 'Ten high', mult: PAI_GOW_PAY[10] },
  { label: 'Jack high', mult: PAI_GOW_PAY[11] },
  { label: 'Queen high', mult: PAI_GOW_PAY[12] },
  { label: 'King high', mult: PAI_GOW_PAY[13] },
  { label: 'Ace high', mult: PAI_GOW_PAY[14] },
]

const FORTUNE_ROWS = [
  { label: HR_NAMES[HR.THREE_KIND], mult: FORTUNE_PAY[HR.THREE_KIND] },
  { label: HR_NAMES[HR.STRAIGHT], mult: FORTUNE_PAY[HR.STRAIGHT] },
  { label: HR_NAMES[HR.FLUSH], mult: FORTUNE_PAY[HR.FLUSH] },
  { label: HR_NAMES[HR.FULL_HOUSE], mult: FORTUNE_PAY[HR.FULL_HOUSE] },
  { label: HR_NAMES[HR.FOUR_KIND], mult: FORTUNE_PAY[HR.FOUR_KIND] },
  { label: HR_NAMES[HR.STRAIGHT_FLUSH], mult: FORTUNE_PAY[HR.STRAIGHT_FLUSH] },
  { label: 'Royal Flush', mult: ROYAL_FLUSH_PAY },
  { label: HR_NAMES[HR.FIVE_ACES], mult: FORTUNE_PAY[HR.FIVE_ACES] },
]

function PayoutTable({ title, blurb, rows }) {
  return (
    <div className="payout-table">
      <div className="payout-table-title">{title}</div>
      <div className="payout-table-blurb">{blurb}</div>
      {rows.map(r => (
        <div className="payout-table-row" key={r.label}>
          <span>{r.label}</span>
          <span className="payout-odds">{r.mult}:1</span>
        </div>
      ))}
    </div>
  )
}

export default function BetControls({ bet, wallet, paiGowSideBet, fortuneSideBet, onBetChange, onSideBetToggle, onDeal }) {
  const [showPayouts, setShowPayouts] = useState(false)

  const sideTotal = (paiGowSideBet ? SIDE_BET_AMOUNT : 0) + (fortuneSideBet ? SIDE_BET_AMOUNT : 0)
  const availableForBet = wallet - sideTotal

  function adjustBet(delta) {
    const next = Math.max(MIN_BET, Math.min(wallet, bet + delta))
    onBetChange(Math.round(next / BET_INCREMENT) * BET_INCREMENT)
  }

  function setChip(amount) {
    const clamped = Math.max(MIN_BET, Math.min(wallet, amount))
    onBetChange(clamped)
  }

  function presetAmount(key) {
    const target = key === 'min' ? MIN_BET : key === 'half' ? availableForBet / 2 : availableForBet
    const rounded = Math.floor(target / BET_INCREMENT) * BET_INCREMENT
    return Math.max(MIN_BET, Math.min(availableForBet, rounded))
  }

  function setPreset(key) {
    onBetChange(presetAmount(key))
  }

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

      <div className="bet-preset-row">
        {BET_PRESETS.map(p => (
          <button
            key={p.key}
            className={`btn-preset${bet === presetAmount(p.key) ? ' preset-active' : ''}`}
            onClick={() => setPreset(p.key)}
            disabled={availableForBet < MIN_BET}
          >
            {p.label}
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

      <button
        className="payout-toggle"
        onClick={() => setShowPayouts(v => !v)}
        aria-expanded={showPayouts}
      >
        {showPayouts ? '▾ Hide side-bet payouts' : '▸ Side-bet payouts'}
      </button>

      {showPayouts && (
        <div className="payout-panel">
          <PayoutTable
            title="Pai Gow Insurance"
            blurb="All 7 cards singletons (a pai gow)"
            rows={PAI_GOW_ROWS}
          />
          <PayoutTable
            title="Fortune"
            blurb="Best 5-of-7 is 3-of-a-kind or better"
            rows={FORTUNE_ROWS}
          />
        </div>
      )}

      <button className="btn-deal" onClick={onDeal} disabled={!canDeal}>
        Deal
      </button>
    </div>
  )
}
