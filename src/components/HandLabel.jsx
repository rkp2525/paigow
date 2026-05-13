import { evaluate5, evaluate2, HR_NAMES } from '../game/handEval.js'

export default function HandLabel({ cards, is2Card, result }) {
  if (!cards || cards.length === 0) return null
  try {
    const ev = is2Card ? evaluate2(cards) : evaluate5(cards)
    const resultClass = result ? ` hand-label-${result.toLowerCase()}` : ''
    return (
      <div className={`hand-label${resultClass}`}>
        {ev.name}
        {result && <span className="hand-result-badge">{result === 'WIN' ? '✓' : result === 'LOSS' ? '✗' : '='}</span>}
      </div>
    )
  } catch {
    return null
  }
}
