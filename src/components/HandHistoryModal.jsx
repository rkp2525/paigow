import Card from './Card.jsx'
import HandLabel from './HandLabel.jsx'
import { sortForDisplay } from '../game/cards.js'
import { roundNet } from '../game/stats.js'

function money(n) {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

function HandRow({ label, cards, is2Card, result }) {
  const sorted = sortForDisplay(cards)
  return (
    <div className="history-hand-row">
      <div className="history-hand-label">{label}</div>
      <div className="card-row card-row-nowrap">
        {sorted.map(c => <Card key={c.id} card={c} small />)}
      </div>
      <HandLabel cards={cards} is2Card={is2Card} result={result} />
    </div>
  )
}

function HistoryEntry({ entry }) {
  const net = roundNet(entry)
  const outcomeClass = entry.outcome === 'WIN' ? 'stat-win' : entry.outcome === 'LOSS' ? 'stat-loss' : 'stat-push'
  const hasCards = Array.isArray(entry.playerBack) && entry.playerBack.length > 0

  return (
    <div className="history-entry">
      <div className="history-entry-head">
        <span className={`history-outcome ${outcomeClass}`}>{entry.outcome}</span>
        <span className="history-bet">Bet ${entry.bet}</span>
        <span className={net >= 0 ? 'stat-card-pos' : 'stat-card-neg'}>{money(net)}</span>
      </div>

      {entry.isFoul && <div className="history-note">Fouled — back hand weaker than front</div>}
      {entry.isAceHighPaiGow && <div className="history-note">Dealer Ace-high Pai Gow — auto push</div>}

      {hasCards ? (
        <div className="history-hands">
          <HandRow label="Your Back" cards={entry.playerBack} is2Card={false} result={entry.backResult} />
          <HandRow label="Your Front" cards={entry.playerFront} is2Card result={entry.frontResult} />
          <HandRow label="Dealer Back" cards={entry.dealerBack} is2Card={false} />
          <HandRow label="Dealer Front" cards={entry.dealerFront} is2Card />
        </div>
      ) : (
        <div className="history-note">Hand detail not recorded for this round</div>
      )}

      {(entry.paiGowSidePlaced || entry.fortuneSidePlaced) && (
        <div className="history-side-bets">
          {entry.paiGowSidePlaced && (
            <span className={entry.paiGowSideWon ? 'stat-card-pos' : 'stat-card-neg'}>
              Pai Gow {entry.paiGowSideWon ? `won ${entry.paiGowSideMultiplier}:1` : 'lost'}
            </span>
          )}
          {entry.fortuneSidePlaced && (
            <span className={entry.fortuneSideWon ? 'stat-card-pos' : 'stat-card-neg'}>
              Fortune {entry.fortuneSideWon ? `won ${entry.fortuneSideMultiplier}:1` : 'lost'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function HandHistoryModal({ handHistory = [], onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-history" onClick={e => e.stopPropagation()}>
        <h2>Hand History</h2>
        {handHistory.length === 0 ? (
          <p>No hands played yet. Deal a round to start building your history!</p>
        ) : (
          <>
            <p className="stats-subtitle">Most recent {handHistory.length} hand{handHistory.length === 1 ? '' : 's'}</p>
            <div className="history-list">
              {handHistory.map((entry, i) => <HistoryEntry key={i} entry={entry} />)}
            </div>
          </>
        )}
        <div className="modal-actions">
          <button className="btn-confirm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
