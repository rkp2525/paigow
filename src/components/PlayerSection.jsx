import { useState } from 'react'
import Card from './Card.jsx'
import HandLabel from './HandLabel.jsx'

// During SETTING phase: player taps cards to move between their hand areas
// playerCards: all 7, playerBack/Front: currently assigned
export default function PlayerSection({
  phase,
  playerCards,
  playerBack,
  playerFront,
  onSetHand,
  backResult,
  frontResult,
}) {
  const [selected, setSelected] = useState(null)

  function handleCardClick(card) {
    if (phase !== 'SETTING') return

    const inFront = playerFront.some(c => c.id === card.id)
    const inBack = playerBack.some(c => c.id === card.id)
    const inUnassigned = !inFront && !inBack

    if (selected === null) {
      setSelected(card.id)
      return
    }

    if (selected === card.id) {
      setSelected(null)
      return
    }

    // Swap or move logic
    const srcCard = [...playerCards].find(c => c.id === selected)
    if (!srcCard) { setSelected(null); return }
    const destCard = card

    const newBack = [...playerBack]
    const newFront = [...playerFront]
    const unassigned = playerCards.filter(c => !playerBack.some(b => b.id === c.id) && !playerFront.some(f => f.id === c.id))

    const srcInFront = newFront.some(c => c.id === srcCard.id)
    const srcInBack = newBack.some(c => c.id === srcCard.id)
    const srcInUnassigned = !srcInFront && !srcInBack
    const destInFront = newFront.some(c => c.id === destCard.id)
    const destInBack = newBack.some(c => c.id === destCard.id)
    const destInUnassigned = !destInFront && !destInBack

    // Swap the two cards' positions
    function replaceIn(arr, oldCard, newCard) {
      return arr.map(c => c.id === oldCard.id ? newCard : c)
    }

    let resultBack = newBack
    let resultFront = newFront

    if (srcInFront && destInBack) {
      resultFront = replaceIn(newFront, srcCard, destCard)
      resultBack = replaceIn(newBack, destCard, srcCard)
    } else if (srcInBack && destInFront) {
      resultBack = replaceIn(newBack, srcCard, destCard)
      resultFront = replaceIn(newFront, destCard, srcCard)
    } else if (srcInFront && destInUnassigned) {
      resultFront = replaceIn(newFront, srcCard, destCard)
    } else if (srcInBack && destInUnassigned) {
      resultBack = replaceIn(newBack, srcCard, destCard)
    } else if (srcInUnassigned && destInFront) {
      resultFront = replaceIn(newFront, destCard, srcCard)
    } else if (srcInUnassigned && destInBack) {
      resultBack = replaceIn(newBack, destCard, srcCard)
    } else if (srcInFront && destInFront) {
      // swap within front (no-op visually but reorder)
      const fi = newFront.findIndex(c => c.id === srcCard.id)
      const fj = newFront.findIndex(c => c.id === destCard.id)
      resultFront = [...newFront]
      ;[resultFront[fi], resultFront[fj]] = [resultFront[fj], resultFront[fi]]
    } else if (srcInBack && destInBack) {
      const bi = newBack.findIndex(c => c.id === srcCard.id)
      const bj = newBack.findIndex(c => c.id === destCard.id)
      resultBack = [...newBack]
      ;[resultBack[bi], resultBack[bj]] = [resultBack[bj], resultBack[bi]]
    }

    setSelected(null)
    onSetHand(resultBack, resultFront)
  }

  function handleZoneClick(zone) {
    if (phase !== 'SETTING' || selected === null) return
    const srcCard = playerCards.find(c => c.id === selected)
    if (!srcCard) { setSelected(null); return }

    const inFront = playerFront.some(c => c.id === srcCard.id)
    const inBack = playerBack.some(c => c.id === srcCard.id)

    let newBack = [...playerBack]
    let newFront = [...playerFront]

    if (zone === 'front' && !inFront) {
      if (newFront.length < 2) {
        // Move from back or unassigned to front
        newFront = [...newFront, srcCard]
        if (inBack) newBack = newBack.filter(c => c.id !== srcCard.id)
      }
    } else if (zone === 'back' && !inBack) {
      if (newBack.length < 5) {
        newBack = [...newBack, srcCard]
        if (inFront) newFront = newFront.filter(c => c.id !== srcCard.id)
      }
    }

    setSelected(null)
    onSetHand(newBack, newFront)
  }

  const unassigned = playerCards.filter(
    c => !playerBack.some(b => b.id === c.id) && !playerFront.some(f => f.id === c.id)
  )

  const showResult = phase === 'RESULT'

  return (
    <div className="player-section">
      <div className="section-title">Your Hand</div>

      {/* Front hand (2-card) */}
      <div
        className={`hand-group hand-drop-zone${playerFront.length < 2 && phase === 'SETTING' ? ' drop-zone-active' : ''}`}
        onClick={() => handleZoneClick('front')}
      >
        <div className="hand-sublabel">
          Front Hand (2-card)
          {phase === 'SETTING' && <span className="hand-count">{playerFront.length}/2</span>}
        </div>
        <div className="card-row">
          {playerFront.map(c => (
            <Card
              key={c.id}
              card={c}
              selected={selected === c.id}
              onClick={(e) => { e.stopPropagation(); handleCardClick(c) }}
            />
          ))}
          {Array(Math.max(0, 2 - playerFront.length)).fill(null).map((_, i) => (
            <Card key={`ph-${i}`} />
          ))}
        </div>
        {showResult && playerFront.length === 2 && (
          <HandLabel cards={playerFront} is2Card result={frontResult} />
        )}
      </div>

      {/* Back hand (5-card) */}
      <div
        className={`hand-group hand-drop-zone${playerBack.length < 5 && phase === 'SETTING' ? ' drop-zone-active' : ''}`}
        onClick={() => handleZoneClick('back')}
      >
        <div className="hand-sublabel">
          Back Hand (5-card)
          {phase === 'SETTING' && <span className="hand-count">{playerBack.length}/5</span>}
        </div>
        <div className="card-row">
          {playerBack.map(c => (
            <Card
              key={c.id}
              card={c}
              selected={selected === c.id}
              onClick={(e) => { e.stopPropagation(); handleCardClick(c) }}
            />
          ))}
          {Array(Math.max(0, 5 - playerBack.length)).fill(null).map((_, i) => (
            <Card key={`pb-${i}`} />
          ))}
        </div>
        {showResult && playerBack.length === 5 && (
          <HandLabel cards={playerBack} is2Card={false} result={backResult} />
        )}
      </div>

      {/* Unassigned cards */}
      {phase === 'SETTING' && unassigned.length > 0 && (
        <div className="hand-group unassigned-group">
          <div className="hand-sublabel">Tap a card to select, then tap a hand zone</div>
          <div className="card-row">
            {unassigned.map(c => (
              <Card
                key={c.id}
                card={c}
                selected={selected === c.id}
                onClick={() => handleCardClick(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
