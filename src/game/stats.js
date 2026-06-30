import { SIDE_BET_AMOUNT } from './gameLogic.js'

// Net wallet change for a single resolved round, matching the same payout
// math gameLogic applies when it updates the wallet:
//   main bet  — WIN: +bet, LOSS: -bet, PUSH: 0
//   side bets — won: +stake × multiplier (multiplier is net odds, X:1),
//               lost: -stake; not placed: 0
export function roundNet(entry) {
  const mainNet =
    entry.outcome === 'WIN' ? entry.bet :
    entry.outcome === 'LOSS' ? -entry.bet : 0

  let sideNet = 0
  if (entry.paiGowSidePlaced) {
    sideNet += entry.paiGowSideWon
      ? SIDE_BET_AMOUNT * entry.paiGowSideMultiplier
      : -SIDE_BET_AMOUNT
  }
  if (entry.fortuneSidePlaced) {
    sideNet += entry.fortuneSideWon
      ? SIDE_BET_AMOUNT * entry.fortuneSideMultiplier
      : -SIDE_BET_AMOUNT
  }
  return mainNet + sideNet
}

// Longest run of a given outcome anywhere in the history. Pushes neither
// extend nor break a streak (consistent with WalletBar.currentStreak).
function longestStreak(history, kind) {
  let best = 0
  let run = 0
  for (const h of history) {
    if (h.outcome === 'PUSH') continue
    if (h.outcome === kind) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

// Current run of consecutive WINs or LOSSes, reading newest-first.
// Pushes are skipped. Returns null when there is no active streak.
function currentStreak(history) {
  let kind = null
  let count = 0
  for (const h of history) {
    if (h.outcome === 'PUSH') continue
    if (kind === null) kind = h.outcome
    if (h.outcome !== kind) break
    count++
  }
  return count > 0 ? { kind, count } : null
}

function sideBetStats(history, placedKey, wonKey, multiplierKey) {
  const placed = history.filter(h => h[placedKey])
  const placedWon = placed.filter(h => h[wonKey])
  const net = placed.reduce(
    (sum, h) => sum + (h[wonKey] ? SIDE_BET_AMOUNT * h[multiplierKey] : -SIDE_BET_AMOUNT),
    0,
  )
  // How often the bet *would* have hit, whether or not it was placed.
  const qualified = history.filter(h => h[wonKey]).length
  return {
    placed: placed.length,
    won: placedWon.length,
    hitRate: placed.length > 0 ? placedWon.length / placed.length : 0,
    qualified,
    qualRate: history.length > 0 ? qualified / history.length : 0,
    net,
  }
}

// Aggregate a history array (newest-first, as stored) into dashboard stats.
export function computeStats(history) {
  const rounds = history.length
  const wins = history.filter(h => h.outcome === 'WIN').length
  const losses = history.filter(h => h.outcome === 'LOSS').length
  const pushes = history.filter(h => h.outcome === 'PUSH').length
  const decided = wins + losses

  const nets = history.map(roundNet)
  const netProfit = nets.reduce((a, b) => a + b, 0)

  return {
    rounds,
    wins,
    losses,
    pushes,
    decided,
    winRate: decided > 0 ? wins / decided : 0,
    netProfit,
    avgBet: rounds > 0 ? history.reduce((s, h) => s + h.bet, 0) / rounds : 0,
    biggestWin: nets.length > 0 ? Math.max(...nets) : 0,
    biggestLoss: nets.length > 0 ? Math.min(...nets) : 0,
    longestWinStreak: longestStreak(history, 'WIN'),
    longestLossStreak: longestStreak(history, 'LOSS'),
    currentStreak: currentStreak(history),
    paiGow: sideBetStats(history, 'paiGowSidePlaced', 'paiGowSideWon', 'paiGowSideMultiplier'),
    fortune: sideBetStats(history, 'fortuneSidePlaced', 'fortuneSideWon', 'fortuneSideMultiplier'),
  }
}
