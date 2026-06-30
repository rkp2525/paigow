import { SIDE_BET_AMOUNT } from '../game/gameLogic.js'
import Confetti from './Confetti.jsx'

export default function ResultOverlay({
  outcome, bet, isAceHighPaiGow, isFoul, foulBackName, foulFrontName,
  coachingHint, paiGowSideBet, fortuneSideBet, paiGowSideResult, fortuneSideResult,
  onNext,
}) {
  const config = {
    WIN:  { label: 'You Win!',  cls: 'result-win',  emoji: '🎉' },
    PUSH: { label: 'Push',     cls: 'result-push', emoji: '🤝' },
    LOSS: { label: 'You Lose', cls: 'result-loss',  emoji: '😞' },
  }
  const { label, cls, emoji } = config[outcome] ?? config.PUSH

  const showSideBets = paiGowSideBet || fortuneSideBet || paiGowSideResult || fortuneSideResult

  // Celebrate a main-hand win or any side bet the player actually placed and hit.
  // Side-bet hits (which can pay big) get a heavier burst.
  const sideBetHit = (paiGowSideBet && paiGowSideResult) || (fortuneSideBet && fortuneSideResult)
  const celebrate = outcome === 'WIN' || sideBetHit

  return (
    <div className={`result-overlay ${cls}`}>
      {celebrate && <Confetti count={sideBetHit ? 120 : 70} />}
      <div className="result-box">
        <div className="result-emoji">{emoji}</div>
        <div className="result-label">{label}</div>
        {outcome === 'WIN' && <div className="result-detail">+${bet}</div>}
        {outcome === 'LOSS' && <div className="result-detail">-${bet}</div>}
        {isFoul && (
          <div className="result-note">
            Foul Hand — {foulFrontName} (front) outranks {foulBackName} (back)
          </div>
        )}
        {isAceHighPaiGow && (
          <div className="result-note">Dealer Ace-High Pai Gow — Table Push</div>
        )}
        {coachingHint && (
          <div className="coaching-hint">
            <div className="coaching-title">
              Could have {coachingHint.bestOutcome === 'WIN' ? 'won' : 'pushed'}
            </div>
            <div className="coaching-hands">
              <span className="coaching-hand">Back: {coachingHint.backName}</span>
              <span className="coaching-hand">Front: {coachingHint.frontName}</span>
            </div>
          </div>
        )}

        {showSideBets && (
          <div className="side-bet-results">
            <SideBetResult
              label="Pai Gow Bet"
              placed={paiGowSideBet}
              result={paiGowSideResult}
              qualifier={paiGowSideResult ? paiGowSideResult.highCardName : null}
            />
            <SideBetResult
              label="Fortune Bet"
              placed={fortuneSideBet}
              result={fortuneSideResult}
              qualifier={fortuneSideResult ? fortuneSideResult.handName : null}
            />
          </div>
        )}

        <button className="btn-next" onClick={onNext}>Next Hand</button>
      </div>
    </div>
  )
}

function SideBetResult({ label, placed, result, qualifier }) {
  if (!placed && !result) return null
  const won = !!result
  // After the early return, placed || result is guaranteed.
  // When !won, result is null so placed must be true — net is always defined.
  const netLabel = placed ? (won ? `+$${SIDE_BET_AMOUNT * result.multiplier}` : `-$${SIDE_BET_AMOUNT}`) : null

  return (
    <div className={`side-bet-result ${won ? 'sbr-win' : placed ? 'sbr-loss' : 'sbr-ghost'}`}>
      <span className="sbr-label">{label}</span>
      {qualifier && <span className="sbr-qualifier">{qualifier} ({result.multiplier}:1)</span>}
      {netLabel && <span className="sbr-net">{netLabel}</span>}
    </div>
  )
}
