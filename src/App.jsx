import { useState, useEffect, useRef } from 'react'
import { PHASE, dealRound, setPlayerHand, resolveRound, nextRound, MIN_BET, BET_INCREMENT } from './game/gameLogic.js'
import { applyHouseWay } from './game/houseWay.js'
import { initState, saveSession, appendAllTimeEntry, loadAllTimeHistory, loadDeckColor, saveDeckColor } from './store/gameStore.js'
import WalletBar from './components/WalletBar.jsx'
import DealerSection from './components/DealerSection.jsx'
import PlayerSection from './components/PlayerSection.jsx'
import BetControls from './components/BetControls.jsx'
import ResultOverlay from './components/ResultOverlay.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import './App.css'

export default function App() {
  const [state, setState] = useState(() => initState())
  const [showSettings, setShowSettings] = useState(false)
  const [allTimeHistory, setAllTimeHistory] = useState(() => loadAllTimeHistory())
  const [deckColor, setDeckColor] = useState(() => loadDeckColor())
  const pendingHistoryEntryRef = useRef(null)

  // Persist wallet whenever it changes
  useEffect(() => {
    saveSession(state)
  }, [state.wallet, state.handHistory])

  function updateState(updater) {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSession(next)
      return next
    })
  }

  function handleDeal() {
    updateState(prev => dealRound({ ...prev, bet: prev.bet }))
  }

  function handleBetChange(amount) {
    updateState(prev => ({ ...prev, bet: amount }))
  }

  function handleSideBetToggle(which) {
    updateState(prev => ({
      ...prev,
      paiGowSideBet: which === 'paiGow' ? !prev.paiGowSideBet : prev.paiGowSideBet,
      fortuneSideBet: which === 'fortune' ? !prev.fortuneSideBet : prev.fortuneSideBet,
    }))
  }

  function handleSetHand(back, front) {
    updateState(prev => {
      const assignedIds = new Set([...back.map(c => c.id), ...front.map(c => c.id)])
      const remaining = prev.playerCards.filter(c => !assignedIds.has(c.id))

      let resolvedBack = back
      let resolvedFront = front

      // Auto-fill the other hand with whatever's left once one hand is complete
      if (front.length === 2 && back.length < 5) {
        resolvedBack = [...back, ...remaining]
      } else if (back.length === 5 && front.length < 2) {
        resolvedFront = [...front, ...remaining]
      }

      return setPlayerHand(prev, resolvedBack, resolvedFront)
    })
  }

  function handleSetByHouseWay() {
    updateState(prev => {
      const { back, front } = applyHouseWay(prev.playerCards)
      return setPlayerHand(prev, back, front)
    })
  }

  // Record alltime entry exactly once per SETTING→RESULT transition, safe under StrictMode
  // and rapid double-clicks (ref is nulled after first effect run)
  useEffect(() => {
    if (state.phase === 'RESULT' && pendingHistoryEntryRef.current) {
      appendAllTimeEntry(pendingHistoryEntryRef.current)
      setAllTimeHistory(loadAllTimeHistory())
      pendingHistoryEntryRef.current = null
    }
  }, [state.phase])

  function handleConfirmHand() {
    if (state.playerBack.length !== 5 || state.playerFront.length !== 2) return
    updateState(prev => {
      if (prev.phase !== 'SETTING') return prev
      const next = resolveRound(prev)
      pendingHistoryEntryRef.current = next.handHistory[0] ?? null
      return next
    })
  }

  function handleNextRound() {
    updateState(prev => nextRound(prev))
  }

  // Keyboard shortcuts: Space/Enter advances the round (Deal → Confirm → Next),
  // H sets the house way while setting. Handlers use functional setState, so the
  // listener stays correct without depending on every handler identity.
  useEffect(() => {
    function onKeyDown(e) {
      if (showSettings) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (phase === PHASE.BETTING) handleDeal()
        else if (phase === PHASE.SETTING) { if (playerHandComplete) handleConfirmHand() }
        else if (phase === PHASE.RESULT) handleNextRound()
      } else if ((e.key === 'h' || e.key === 'H') && phase === PHASE.SETTING) {
        e.preventDefault()
        handleSetByHouseWay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, playerHandComplete, showSettings])

  function handleResetWallet(newWallet) {
    updateState(() => initState(newWallet))
    setShowSettings(false)
  }

  function handleDeckColorChange(color) {
    setDeckColor(color)
    saveDeckColor(color)
  }

  const { phase, wallet, bet, playerCards, playerBack, playerFront,
    dealerBack, dealerFront, outcome, isAceHighPaiGow, isFoul,
    foulBackName, foulFrontName, backResult, frontResult, coachingHint,
    paiGowSideBet, fortuneSideBet, paiGowSideResult, fortuneSideResult,
    handHistory } = state

  const playerHandComplete = playerBack.length === 5 && playerFront.length === 2
  const dealerRevealed = phase === 'SETTING' || phase === 'RESULT'

  // In Face Up: dealer cards are always shown in SETTING phase
  // Only show results comparison in RESULT phase
  const showDealerResult = phase === 'RESULT'

  return (
    <div className="app" style={{ '--deck-color': deckColor }}>
      <header className="app-header">
        <div className="app-title">Face Up Pai Gow</div>
        <WalletBar wallet={wallet} handHistory={handHistory} onReset={() => setShowSettings(true)} />
      </header>

      <main className="game-area">
        {/* Dealer section always at top */}
        <DealerSection
          dealerFront={dealerFront}
          dealerBack={dealerBack}
          backResult={showDealerResult ? flipResult(backResult) : null}
          frontResult={showDealerResult ? flipResult(frontResult) : null}
          revealed={dealerRevealed}
        />

        <div className="divider" />

        {/* Player section */}
        {phase === 'BETTING' && (
          <BetControls
            bet={bet}
            wallet={wallet}
            paiGowSideBet={paiGowSideBet}
            fortuneSideBet={fortuneSideBet}
            onBetChange={handleBetChange}
            onSideBetToggle={handleSideBetToggle}
            onDeal={handleDeal}
          />
        )}

        {(phase === 'SETTING' || phase === 'RESULT') && (
          <PlayerSection
            phase={phase}
            playerCards={playerCards}
            playerBack={playerBack}
            playerFront={playerFront}
            onSetHand={handleSetHand}
            backResult={backResult}
            frontResult={frontResult}
          />
        )}

        {/* Setting phase controls */}
        {phase === 'SETTING' && (
          <div className="setting-controls">
            <button className="btn-houseway" onClick={handleSetByHouseWay} title="Set house way (H)">
              House Way
            </button>
            <button
              className="btn-confirm-hand"
              onClick={handleConfirmHand}
              disabled={!playerHandComplete}
              title="Confirm hand (Enter)"
            >
              {playerHandComplete ? 'Confirm Hand' : `Set All Cards (${playerBack.length + playerFront.length}/7)`}
            </button>
          </div>
        )}
      </main>

      {/* Result overlay */}
      {phase === 'RESULT' && (
        <ResultOverlay
          outcome={outcome}
          bet={bet}
          isAceHighPaiGow={isAceHighPaiGow}
          isFoul={isFoul}
          foulBackName={foulBackName}
          foulFrontName={foulFrontName}
          coachingHint={coachingHint}
          paiGowSideBet={paiGowSideBet}
          fortuneSideBet={fortuneSideBet}
          paiGowSideResult={paiGowSideResult}
          fortuneSideResult={fortuneSideResult}
          onNext={handleNextRound}
        />
      )}

      {showSettings && (
        <SettingsModal
          wallet={wallet}
          allTimeHistory={allTimeHistory}
          handHistory={handHistory}
          deckColor={deckColor}
          onDeckColorChange={handleDeckColorChange}
          onSave={handleResetWallet}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// Flip a player-perspective result to dealer perspective
function flipResult(r) {
  if (r === 'WIN') return 'LOSS'
  if (r === 'LOSS') return 'WIN'
  return r
}
