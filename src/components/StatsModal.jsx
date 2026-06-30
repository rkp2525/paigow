import { computeStats } from '../game/stats.js'

function money(n) {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

function StatCard({ label, value, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value${tone ? ` stat-card-${tone}` : ''}`}>{value}</div>
    </div>
  )
}

function SideBetCard({ label, stats }) {
  return (
    <div className="stat-sidebet">
      <div className="stat-sidebet-head">
        <span className="stat-sidebet-label">{label}</span>
        <span className="stat-sidebet-qual">
          hit {stats.qualified}/{stats.rounds ?? stats.qualified} times
        </span>
      </div>
      {stats.placed > 0 ? (
        <div className="stat-sidebet-detail">
          <span>
            Bet {stats.placed}×, won {stats.won} ({Math.round(stats.hitRate * 100)}%)
          </span>
          <span className={stats.net >= 0 ? 'stat-card-pos' : 'stat-card-neg'}>
            {money(stats.net)}
          </span>
        </div>
      ) : (
        <div className="stat-sidebet-detail stat-sidebet-empty">Never placed</div>
      )}
    </div>
  )
}

export default function StatsModal({ allTimeHistory = [], onClose }) {
  const s = computeStats(allTimeHistory)

  if (s.rounds === 0) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h2>Statistics</h2>
          <p>No hands played yet. Deal a round to start tracking your stats!</p>
          <div className="modal-actions">
            <button className="btn-confirm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  const streak = s.currentStreak
  const streakValue = streak
    ? `${streak.kind === 'WIN' ? '🔥' : '🧊'} ${streak.count} ${streak.kind === 'WIN' ? 'W' : 'L'}`
    : '—'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-stats" onClick={e => e.stopPropagation()}>
        <h2>Statistics</h2>
        <p className="stats-subtitle">All-time across {s.rounds} hands</p>

        <div className="stat-grid">
          <StatCard label="Win Rate" value={`${Math.round(s.winRate * 100)}%`} />
          <StatCard
            label="Record (W-P-L)"
            value={`${s.wins}-${s.pushes}-${s.losses}`}
          />
          <StatCard
            label="Net Profit"
            value={money(s.netProfit)}
            tone={s.netProfit >= 0 ? 'pos' : 'neg'}
          />
          <StatCard label="Avg Bet" value={`$${Math.round(s.avgBet)}`} />
          <StatCard label="Biggest Win" value={money(s.biggestWin)} tone="pos" />
          <StatCard
            label="Biggest Loss"
            value={money(s.biggestLoss)}
            tone={s.biggestLoss < 0 ? 'neg' : undefined}
          />
          <StatCard label="Best Streak" value={`${s.longestWinStreak} W`} tone="pos" />
          <StatCard label="Worst Streak" value={`${s.longestLossStreak} L`} tone="neg" />
        </div>

        <div className="stat-current-streak">
          <span className="stat-card-label">Current streak</span>
          <span className="stat-current-streak-val">{streakValue}</span>
        </div>

        <div className="stat-sidebets">
          <div className="alltime-title">Side Bets</div>
          <SideBetCard label="Pai Gow" stats={{ ...s.paiGow, rounds: s.rounds }} />
          <SideBetCard label="Fortune" stats={{ ...s.fortune, rounds: s.rounds }} />
        </div>

        <div className="modal-actions">
          <button className="btn-confirm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
