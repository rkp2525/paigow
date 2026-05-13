export default function ResultOverlay({ outcome, bet, isAceHighPaiGow, isFoul, foulBackName, foulFrontName, onNext }) {
  const config = {
    WIN:  { label: 'You Win!',  cls: 'result-win',  emoji: '🎉' },
    PUSH: { label: 'Push',     cls: 'result-push', emoji: '🤝' },
    LOSS: { label: 'You Lose', cls: 'result-loss',  emoji: '😞' },
  }
  const { label, cls, emoji } = config[outcome] ?? config.PUSH

  return (
    <div className={`result-overlay ${cls}`}>
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
        <button className="btn-next" onClick={onNext}>Next Hand</button>
      </div>
    </div>
  )
}
