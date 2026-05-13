import { useState, useEffect, useCallback } from 'react'
import { PHASE, dealRound, setPlayerHand, resolveRound, nextRound, MIN_BET, BET_INCREMENT } from './game/gameLogic.js'
import { applyHouseWay } from './game/houseWay.js'
import { initState, saveSession, appendAllTimeEntry, loadAllTimeHistory } from './store/gameStore.js'
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

  function handleConfirmHand() {
    if (state.playerBack.length !== 5 || state.playerFront.length !== 2) return
    updateState(prev => {
      const next = resolveRound(prev)
      if (next.handHistory.length > 0) {
        appendAllTimeEntry(next.handHistory[0])
        setAllTimeHistory(loadAllTimeHistory())
      }
      return next
    })
  }

  function handleNextRound() {
    updateState(prev => nextRound(prev))
  }

  function handleResetWallet(newWallet) {
    updateState(() => initState(newWallet))
    setShowSettings(false)
  }

  const { phase, wallet, bet, playerCards, playerBack, playerFront,
    dealerBack, dealerFront, outcome, isAceHighPaiGow,
    backResult, frontResult, handHistory } = state

  const playerHandComplete = playerBack.length === 5 && playerFront.length === 2
  const dealerRevealed = phase === 'SETTING' || phase === 'RESULT'

  // In Face Up: dealer cards are always shown in SETTING phase
  // Only show results comparison in RESULT phase
  const showDealerResult = phase === 'RESULT'

  return (
    <div className="app">
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
            onBetChange={handleBetChange}
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
            <button className="btn-houseway" onClick={handleSetByHouseWay}>
              House Way
            </button>
            <button
              className="btn-confirm-hand"
              onClick={handleConfirmHand}
              disabled={!playerHandComplete}
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
          onNext={handleNextRound}
        />
      )}

      {showSettings && (
        <SettingsModal
          wallet={wallet}
          allTimeHistory={allTimeHistory}
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
