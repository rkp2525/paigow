// Dependency-free SVG bankroll graph.
// `balances` is a chronological array of wallet values (oldest first).
export default function BankrollGraph({ balances }) {
  if (!balances || balances.length < 2) return null

  const W = 280
  const H = 90
  const PAD = 4

  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = max - min || 1

  const n = balances.length
  const x = i => PAD + (i / (n - 1)) * (W - 2 * PAD)
  const y = v => PAD + (1 - (v - min) / range) * (H - 2 * PAD)

  const points = balances.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const linePath = `M ${points.join(' L ')}`
  // Area fill below the line, closed along the bottom edge.
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)},${H - PAD} L ${x(0).toFixed(1)},${H - PAD} Z`

  const first = balances[0]
  const last = balances[n - 1]
  const net = last - first
  const up = net >= 0
  const stroke = up ? 'var(--win-color)' : 'var(--loss-color)'

  // Reference line at the starting balance, if it falls within range.
  const showBaseline = first >= min && first <= max
  const baselineY = y(first)

  return (
    <div className="bankroll-graph">
      <div className="bankroll-graph-head">
        <span className="alltime-title">Session Bankroll</span>
        <span className={`bankroll-net ${up ? 'bankroll-net-pos' : 'bankroll-net-neg'}`}>
          {up ? '+' : '−'}${Math.abs(net)}
        </span>
      </div>
      <svg
        className="bankroll-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Bankroll over ${n} hands, net ${up ? 'up' : 'down'} ${Math.abs(net)} dollars`}
      >
        <defs>
          <linearGradient id="bankrollFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showBaseline && (
          <line
            x1={PAD} y1={baselineY} x2={W - PAD} y2={baselineY}
            stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3"
          />
        )}
        <path d={areaPath} fill="url(#bankrollFill)" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(last)} r="2.5" fill={stroke} />
      </svg>
      <div className="bankroll-axis">
        <span>${first}</span>
        <span className="bankroll-axis-meta">{n} hands</span>
        <span>${last}</span>
      </div>
    </div>
  )
}
