import { isJoker, SUIT_SYMBOLS, SUIT_COLORS } from '../game/cards.js'

const RANK_DISPLAY = {
  '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A', 'JK': '★'
}

export default function Card({ card, selected, dragging, onClick, onPointerDown, small, faceDown }) {
  if (!card) return <div className={`card card-placeholder${small ? ' card-sm' : ''}`} />

  if (faceDown) {
    return (
      <div className={`card card-back${small ? ' card-sm' : ''}`} onClick={onClick} onPointerDown={onPointerDown}>
        <div className="card-back-pattern" />
      </div>
    )
  }

  const joker = isJoker(card)
  const suit = joker ? null : card.suit
  const color = joker ? 'purple' : SUIT_COLORS[suit]
  const suitSym = joker ? '🃏' : SUIT_SYMBOLS[suit]
  const rank = RANK_DISPLAY[card.rank] ?? card.rank

  return (
    <div
      className={`card${small ? ' card-sm' : ''}${selected ? ' card-selected' : ''}${dragging ? ' card-dragging' : ''}${onClick || onPointerDown ? ' card-clickable' : ''}${joker ? ' card-joker' : ''}`}
      style={{ '--card-color': color }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div className="card-corner card-corner-tl">
        <span className="card-rank">{rank}</span>
        {!joker && <span className="card-suit">{suitSym}</span>}
      </div>
      <div className="card-center">
        {joker ? <span className="card-joker-sym">🃏</span> : <span className="card-suit-lg">{suitSym}</span>}
      </div>
      <div className="card-corner card-corner-br">
        <span className="card-rank">{rank}</span>
        {!joker && <span className="card-suit">{suitSym}</span>}
      </div>
    </div>
  )
}
