import { evaluate5, evaluate2, HR } from '../game/handEval.js'

const RANK_LABEL = {
  14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten', 9: 'Nine',
  8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two',
}

function rankName(v) {
  return RANK_LABEL[v] ?? String(v)
}

function plural(v) {
  const name = rankName(v)
  return name.endsWith('x') ? `${name}es` : `${name}s` // Six -> Sixes
}

// Turn an evaluated hand into a descriptive label (e.g. "King-Queen High",
// "Pair of Aces", "Two Pair, Kings & Sevens"). Falls back to the plain name.
function describe(ev) {
  const t = ev.tiebreakers ?? []
  switch (ev.rank) {
    case HR.HIGH_CARD:
      return t.length >= 2 ? `${rankName(t[0])}-${rankName(t[1])} High` : `${rankName(t[0])} High`
    case HR.ONE_PAIR:
      return `Pair of ${plural(t[0])}`
    case HR.TWO_PAIR:
      return `Two Pair, ${plural(t[0])} & ${plural(t[1])}`
    case HR.THREE_KIND:
      return `Three of a Kind, ${plural(t[0])}`
    case HR.STRAIGHT:
      return `Straight, ${rankName(t[0])}-high`
    case HR.FLUSH:
      return `Flush, ${rankName(t[0])}-high`
    case HR.FULL_HOUSE:
      return `Full House, ${plural(t[0])} over ${plural(t[1])}`
    case HR.FOUR_KIND:
      return `Four of a Kind, ${plural(t[0])}`
    case HR.STRAIGHT_FLUSH:
      return `Straight Flush, ${rankName(t[0])}-high`
    default:
      return ev.name // Royal Flush, Five Aces
  }
}

export default function HandLabel({ cards, is2Card, result }) {
  if (!cards || cards.length === 0) return null
  try {
    const ev = is2Card ? evaluate2(cards) : evaluate5(cards)
    const resultClass = result ? ` hand-label-${result.toLowerCase()}` : ''
    return (
      <div className={`hand-label${resultClass}`}>
        {describe(ev)}
        {result && <span className="hand-result-badge">{result === 'WIN' ? '✓' : result === 'LOSS' ? '✗' : '='}</span>}
      </div>
    )
  } catch {
    return null
  }
}
