import { useState, useEffect, useRef } from 'react'
import Card from './Card.jsx'
import HandLabel from './HandLabel.jsx'
import { sortForDisplay } from '../game/cards.js'

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
  // drag: { card, x, y } — card being dragged and current pointer position
  const [drag, setDrag] = useState(null)
  const [overZone, setOverZone] = useState(null)
  // Track whether a significant move happened so tap and drag don't conflict
  const dragMoved = useRef(false)
  const dragStart = useRef(null)

  // Attach global pointermove/pointerup while a drag is active
  useEffect(() => {
    if (!drag) return

    function onMove(e) {
      const x = e.clientX
      const y = e.clientY
      // Detect meaningful movement
      if (!dragMoved.current && dragStart.current) {
        const dx = x - dragStart.current.x
        const dy = y - dragStart.current.y
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragMoved.current = true
      }
      setDrag(d => d ? { ...d, x, y } : null)

      // Determine which zone the ghost is over (ghost has pointer-events:none)
      const el = document.elementFromPoint(x, y)
      setOverZone(el?.closest('[data-zone]')?.dataset?.zone ?? null)
    }

    function onUp(e) {
      if (dragMoved.current && drag) {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const zone = el?.closest('[data-zone]')?.dataset?.zone
        if (zone) dropCard(drag.card, zone)
      }
      setDrag(null)
      setOverZone(null)
      dragMoved.current = false
      dragStart.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, playerBack, playerFront])

  function startDrag(e, card) {
    if (phase !== 'SETTING') return
    e.preventDefault()
    dragMoved.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    setDrag({ card, x: e.clientX, y: e.clientY })
  }

  // Move card into a target zone, removing it from wherever it currently is
  function dropCard(card, targetZone) {
    let newBack = playerBack.filter(c => c.id !== card.id)
    let newFront = playerFront.filter(c => c.id !== card.id)

    if (targetZone === 'front' && newFront.length < 2) {
      newFront = [...newFront, card]
    } else if (targetZone === 'back' && newBack.length < 5) {
      newBack = [...newBack, card]
    }
    onSetHand(newBack, newFront)
  }

  // Tap-to-select: first tap selects, second tap on a zone or another card moves/swaps
  function handleCardClick(card) {
    if (phase !== 'SETTING') return
    if (dragMoved.current) return // was a drag, not a tap

    if (selected === null) {
      setSelected(card.id)
      return
    }
    if (selected === card.id) {
      setSelected(null)
      return
    }

    const srcCard = playerCards.find(c => c.id === selected)
    if (!srcCard) { setSelected(null); return }

    const newBack = [...playerBack]
    const newFront = [...playerFront]

    const srcInFront = newFront.some(c => c.id === srcCard.id)
    const srcInBack = newBack.some(c => c.id === srcCard.id)
    const srcInUnassigned = !srcInFront && !srcInBack
    const destInFront = newFront.some(c => c.id === card.id)
    const destInBack = newBack.some(c => c.id === card.id)
    const destInUnassigned = !destInFront && !destInBack

    function replaceIn(arr, oldCard, newCard) {
      return arr.map(c => c.id === oldCard.id ? newCard : c)
    }

    let resultBack = newBack
    let resultFront = newFront

    if (srcInFront && destInBack) {
      resultFront = replaceIn(newFront, srcCard, card)
      resultBack = replaceIn(newBack, card, srcCard)
    } else if (srcInBack && destInFront) {
      resultBack = replaceIn(newBack, srcCard, card)
      resultFront = replaceIn(newFront, card, srcCard)
    } else if (srcInFront && destInUnassigned) {
      resultFront = replaceIn(newFront, srcCard, card)
    } else if (srcInBack && destInUnassigned) {
      resultBack = replaceIn(newBack, srcCard, card)
    } else if (srcInUnassigned && destInFront) {
      resultFront = replaceIn(newFront, card, srcCard)
    } else if (srcInUnassigned && destInBack) {
      resultBack = replaceIn(newBack, card, srcCard)
    } else if (srcInFront && destInFront) {
      const fi = newFront.findIndex(c => c.id === srcCard.id)
      const fj = newFront.findIndex(c => c.id === card.id)
      resultFront = [...newFront];
      [resultFront[fi], resultFront[fj]] = [resultFront[fj], resultFront[fi]]
    } else if (srcInBack && destInBack) {
      const bi = newBack.findIndex(c => c.id === srcCard.id)
      const bj = newBack.findIndex(c => c.id === card.id)
      resultBack = [...newBack];
      [resultBack[bi], resultBack[bj]] = [resultBack[bj], resultBack[bi]]
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

    if (zone === 'front' && !inFront && newFront.length < 2) {
      newFront = [...newFront, srcCard]
      if (inBack) newBack = newBack.filter(c => c.id !== srcCard.id)
    } else if (zone === 'back' && !inBack && newBack.length < 5) {
      newBack = [...newBack, srcCard]
      if (inFront) newFront = newFront.filter(c => c.id !== srcCard.id)
    }

    setSelected(null)
    onSetHand(newBack, newFront)
  }

  const unassigned = playerCards.filter(
    c => !playerBack.some(b => b.id === c.id) && !playerFront.some(f => f.id === c.id)
  )
  const showResult = phase === 'RESULT'
  const draggingId = drag?.card?.id

  // Order hands for reading left-to-right once locked in. Pure display —
  // evaluation is order-independent so this doesn't affect outcomes.
  const displayFront = showResult ? sortForDisplay(playerFront) : playerFront
  const displayBack = showResult ? sortForDisplay(playerBack) : playerBack

  return (
    <div className="player-section">
      <div className="section-title">Your Hand</div>

      {/* Front hand drop zone */}
      <div
        data-zone="front"
        className={`hand-group hand-drop-zone${
          phase === 'SETTING' && playerFront.length < 2 ? ' drop-zone-active' : ''
        }${overZone === 'front' ? ' drop-zone-hover' : ''}`}
        onClick={() => handleZoneClick('front')}
      >
        <div className="hand-sublabel">
          Front Hand (2-card)
          {phase === 'SETTING' && <span className="hand-count">{playerFront.length}/2</span>}
        </div>
        <div className="card-row">
          {displayFront.map(c => (
            <Card
              key={c.id}
              card={c}
              selected={selected === c.id}
              dragging={draggingId === c.id}
              onPointerDown={e => startDrag(e, c)}
              onClick={e => { e.stopPropagation(); handleCardClick(c) }}
            />
          ))}
          {Array(Math.max(0, 2 - playerFront.length)).fill(null).map((_, i) => (
            <Card key={`ph-${i}`} />
          ))}
        </div>
        {showResult && playerFront.length === 2 && (
          <HandLabel cards={displayFront} is2Card result={frontResult} />
        )}
      </div>

      {/* Back hand drop zone */}
      <div
        data-zone="back"
        className={`hand-group hand-drop-zone${
          phase === 'SETTING' && playerBack.length < 5 ? ' drop-zone-active' : ''
        }${overZone === 'back' ? ' drop-zone-hover' : ''}`}
        onClick={() => handleZoneClick('back')}
      >
        <div className="hand-sublabel">
          Back Hand (5-card)
          {phase === 'SETTING' && <span className="hand-count">{playerBack.length}/5</span>}
        </div>
        <div className="card-row">
          {displayBack.map(c => (
            <Card
              key={c.id}
              card={c}
              selected={selected === c.id}
              dragging={draggingId === c.id}
              onPointerDown={e => startDrag(e, c)}
              onClick={e => { e.stopPropagation(); handleCardClick(c) }}
            />
          ))}
          {Array(Math.max(0, 5 - playerBack.length)).fill(null).map((_, i) => (
            <Card key={`pb-${i}`} />
          ))}
        </div>
        {showResult && playerBack.length === 5 && (
          <HandLabel cards={displayBack} is2Card={false} result={backResult} />
        )}
      </div>

      {/* Unassigned cards */}
      {phase === 'SETTING' && unassigned.length > 0 && (
        <div
          data-zone="unassigned"
          className="hand-group unassigned-group"
        >
          <div className="hand-sublabel">
            Your Cards
            <span className="hand-count">{unassigned.length} remaining</span>
          </div>
          <div className="card-row card-row-nowrap">
            {unassigned.map(c => (
              <Card
                key={c.id}
                card={c}
                small
                selected={selected === c.id}
                dragging={draggingId === c.id}
                onPointerDown={e => startDrag(e, c)}
                onClick={() => handleCardClick(c)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Drag ghost — follows pointer, pointer-events:none so zones remain hittable */}
      {drag && dragMoved.current && (
        <div
          className="card-ghost"
          style={{ left: drag.x, top: drag.y }}
        >
          <Card card={drag.card} />
        </div>
      )}
    </div>
  )
}
