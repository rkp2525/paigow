import { isJoker, rankValue } from './cards.js'
import { evaluate5, HR } from './handEval.js'

// Standard house way (based on Foxwoods/common casino rules)
// Returns { back: [5 cards], front: [2 cards] }
export function applyHouseWay(cards7) {
  const sorted = sortByRank(cards7)
  const analysis = analyzeHand(sorted)
  return setByHouseWay(sorted, analysis)
}

// Sort cards highest rank first (joker = highest for sorting purposes)
function sortByRank(cards) {
  return [...cards].sort((a, b) => rankValue(b) - rankValue(a))
}

function rv(card) {
  return rankValue(card)
}

// Analyze the 7 cards to detect hand types
function analyzeHand(sorted) {
  const hasJoker = sorted.some(isJoker)
  const natural = sorted.filter(c => !isJoker(c))

  // Count ranks (natural cards only)
  const rankCounts = {}
  for (const c of natural) {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1
  }

  // If joker present, it temporarily acts as an ace for grouping purposes
  if (hasJoker) {
    rankCounts['A'] = (rankCounts['A'] || 0) + 1
  }

  // Count suits
  const suitCounts = {}
  for (const c of natural) {
    if (c.suit) suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1
  }

  // Groups by count
  const quads = Object.entries(rankCounts).filter(([, c]) => c === 4).map(([r]) => r)
  const trips = Object.entries(rankCounts).filter(([, c]) => c === 3).map(([r]) => r)
  const pairs = Object.entries(rankCounts).filter(([, c]) => c >= 2).map(([r]) => r)
    .sort((a, b) => rankValStr(b) - rankValStr(a))

  const fiveAces = rankCounts['A'] >= 4 && hasJoker

  // Detect straights (need 5 consecutive ranks among the 7 cards)
  const allRankVals = sorted.map(c => isJoker(c) ? 14 : rv(c))
  const straight = findBestStraight(allRankVals, hasJoker)

  // Detect flushes
  const flush = findBestFlush(sorted)

  return { hasJoker, rankCounts, quads, trips, pairs, fiveAces, straight, flush, natural }
}

function rankValStr(r) {
  const map = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 }
  return map[r] ?? 0
}

function findBestStraight(rankVals, hasJoker) {
  const unique = [...new Set(rankVals)].sort((a, b) => b - a)
  const n = hasJoker ? 1 : 0 // joker can fill one gap

  // Try all windows of 5
  for (let high = 14; high >= 6; high--) {
    const needed = [high, high-1, high-2, high-3, high-4]
    const missing = needed.filter(r => !unique.includes(r))
    if (missing.length <= n) {
      return high
    }
  }
  // Wheel: A-2-3-4-5 (high = 5)
  const wheelNeeded = [14, 5, 4, 3, 2]
  const wheelMissing = wheelNeeded.filter(r => !unique.includes(r))
  if (wheelMissing.length <= n) return 5

  return null
}

function findBestFlush(cards) {
  const natural = cards.filter(c => !isJoker(c))
  const hasJoker = cards.some(isJoker)
  const suitGroups = {}
  for (const c of natural) {
    if (!suitGroups[c.suit]) suitGroups[c.suit] = []
    suitGroups[c.suit].push(c)
  }
  for (const [suit, group] of Object.entries(suitGroups)) {
    const total = group.length + (hasJoker ? 1 : 0)
    if (total >= 5) return { suit, cards: group }
  }
  return null
}

// Build front+back split
function split(back5, cards7) {
  const backIds = new Set(back5.map(c => c.id))
  const front2 = cards7.filter(c => !backIds.has(c.id))
  return { back: back5, front: front2 }
}

function setByHouseWay(sorted, analysis) {
  const { hasJoker, quads, trips, pairs, fiveAces, straight, flush } = analysis

  // --- FIVE ACES ---
  if (fiveAces) {
    return handleFiveAces(sorted)
  }

  // --- STRAIGHT FLUSH / ROYAL FLUSH ---
  const sfResult = tryBestStraightFlush(sorted)
  if (sfResult) {
    // Check if breaking it gives better overall
    // House way: never break straight flush
    return sfResult
  }

  // --- FOUR OF A KIND ---
  if (quads.length > 0) {
    return handleFourOfAKind(sorted, quads[0])
  }

  // --- FULL HOUSE (trips + pair in 7 cards) ---
  // Could also be trips + two pairs
  if (trips.length > 0 && pairs.length >= 2) {
    return handleTripsAndMultiplePairs(sorted, trips, pairs)
  }

  // --- FLUSH ---
  if (flush) {
    const flushResult = tryFlush(sorted, analysis)
    if (flushResult) return flushResult
  }

  // --- STRAIGHT ---
  if (straight) {
    return handleStraight(sorted, straight, analysis)
  }

  // --- THREE OF A KIND ---
  if (trips.length > 0) {
    return handleTrips(sorted, trips[0])
  }

  // --- THREE PAIR ---
  if (pairs.length >= 3) {
    return handleThreePair(sorted, pairs)
  }

  // --- TWO PAIR ---
  if (pairs.length >= 2) {
    return handleTwoPair(sorted, pairs)
  }

  // --- ONE PAIR ---
  if (pairs.length === 1) {
    return handleOnePair(sorted, pairs[0])
  }

  // --- NO PAIR ---
  return handleNoPair(sorted)
}

// ---- HANDLERS ----

function handleFiveAces(sorted) {
  // Five Aces = 4 natural aces + joker
  const joker = sorted.find(isJoker)
  const aces = sorted.filter(c => c.rank === 'A')
  const others = sorted.filter(c => c.rank !== 'A' && !isJoker(c))
    .sort((a, b) => rv(b) - rv(a))

  // If remaining 2 cards are pair of kings → keep 5 aces in back, KK in front
  if (others.length >= 2 && others[0].rank === 'K' && others[1].rank === 'K') {
    const back = [joker, ...aces.slice(0, 4)]
    const front = others.slice(0, 2)
    return { back, front }
  }

  // Default: split → AA in front, AAA + kickers in back
  const front = [joker, aces[0]]  // joker=ace + 1 ace = pair of aces
  const back = [...aces.slice(1), ...others.slice(0, 3)]
  return { back, front }
}

function tryBestStraightFlush(cards7) {
  const natural = cards7.filter(c => !isJoker(c))
  const hasJoker = cards7.some(isJoker)

  const suitGroups = {}
  for (const c of natural) {
    if (!suitGroups[c.suit]) suitGroups[c.suit] = []
    suitGroups[c.suit].push(c)
  }

  for (const [, group] of Object.entries(suitGroups)) {
    const withJoker = hasJoker ? [...group, cards7.find(isJoker)] : group
    if (withJoker.length < 5) continue

    // Try all 5-card combos from this suit group
    const best = bestSFCombo(withJoker, cards7)
    if (best) return best
  }
  return null
}

function bestSFCombo(suitCards, all7) {
  if (suitCards.length < 5) return null
  // Generate all 5-card combos from suitCards
  const combos = choose5(suitCards)
  let bestCombo = null
  let bestEval = null
  for (const combo of combos) {
    const ev = evaluate5(combo)
    if (ev.rank >= 9) { // straight flush or better
      if (!bestEval || ev.rank > bestEval.rank ||
          (ev.rank === bestEval.rank && ev.tiebreakers[0] > bestEval.tiebreakers[0])) {
        bestCombo = combo
        bestEval = ev
      }
    }
  }
  if (!bestCombo) return null
  return split(bestCombo, all7)
}

function handleFourOfAKind(sorted, quadRank) {
  const quads = sorted.filter(c => c.rank === quadRank || (isJoker(c) && quadRank === 'A'))
  const others = sorted.filter(c => c.rank !== quadRank && !isJoker(c))
    .sort((a, b) => rv(b) - rv(a))

  const qv = rankValStr(quadRank)

  // 2s-5s: never split → keep all 4 in back
  if (qv <= 5) {
    const back = [...quads.slice(0, 4), others[0]]
    const front = others.slice(1, 3)
    return { back, front }
  }

  // Aces or Kings: always split
  if (qv >= 13) {
    const back = [...quads.slice(0, 2), ...others.slice(0, 3)]
    const front = quads.slice(2, 4)
    return { back, front }
  }

  // 6s-9s: split unless King or better in front (don't split)
  if (qv >= 6 && qv <= 9) {
    if (others.length >= 2 && rv(others[0]) >= 13) {
      // Don't split: keep quads in back
      const back = [...quads.slice(0, 4), others[0]]
      const front = others.slice(1, 3)
      return { back, front }
    }
    // Split
    const back = [...quads.slice(0, 2), ...others.slice(0, 3)]
    const front = quads.slice(2, 4)
    return { back, front }
  }

  // 10s-Qs: split unless Ace in front (don't split)
  if (qv >= 10 && qv <= 12) {
    if (others.length >= 2 && rv(others[0]) >= 14) {
      // Don't split
      const back = [...quads.slice(0, 4), others[0]]
      const front = others.slice(1, 3)
      return { back, front }
    }
    // Split
    const back = [...quads.slice(0, 2), ...others.slice(0, 3)]
    const front = quads.slice(2, 4)
    return { back, front }
  }

  // Fallback: split
  const back = [...quads.slice(0, 2), ...others.slice(0, 3)]
  const front = quads.slice(2, 4)
  return { back, front }
}

function handleTripsAndMultiplePairs(sorted, trips, pairs) {
  // Could have: trips + pair (full house), or trips + two pairs
  const tripRank = trips[0]
  const tripCards = sorted.filter(c => c.rank === tripRank || (isJoker(c) && tripRank === 'A')).slice(0, 3)
  const others = sorted.filter(c => !tripCards.includes(c)).sort((a, b) => rv(b) - rv(a))

  // Find pairs among others
  const otherPairs = findPairsIn(others)

  if (otherPairs.length >= 2) {
    // trips + two pairs → put highest pair in front
    const highPair = otherPairs[0]
    const lowPair = otherPairs[1]
    const highPairCards = others.filter(c => c.rank === highPair).slice(0, 2)
    const remaining = others.filter(c => !highPairCards.includes(c))
    const back = [...tripCards, ...remaining.slice(0, 2)]
    const front = highPairCards
    return { back, front }
  }

  // trips + one pair → full house: put pair in front
  const pairRank = otherPairs[0] || null
  if (pairRank) {
    const pairCards = others.filter(c => c.rank === pairRank).slice(0, 2)
    const front = pairCards
    const back = [...tripCards, ...others.filter(c => !pairCards.includes(c)).slice(0, 2)]
    return { back, front }
  }

  // Fallback
  return handleTrips(sorted, tripRank)
}

function findPairsIn(cards) {
  const counts = {}
  for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1
  return Object.entries(counts).filter(([, c]) => c >= 2).map(([r]) => r)
    .sort((a, b) => rankValStr(b) - rankValStr(a))
}

function tryFlush(sorted, analysis) {
  const { flush, straight } = analysis
  if (!flush) return null

  const hasJoker = sorted.some(isJoker)
  const flushSuit = flush.suit
  const flushNatural = flush.cards.sort((a, b) => rv(b) - rv(a))
  const flushWithJoker = hasJoker ? [sorted.find(isJoker), ...flushNatural] : flushNatural
  const nonFlush = sorted.filter(c => c.suit !== flushSuit && !isJoker(c))
    .sort((a, b) => rv(b) - rv(a))

  // If we also have a straight using the flush cards → straight flush handled above
  // Just use the flush
  if (flushWithJoker.length >= 5) {
    const back = flushWithJoker.slice(0, 5)
    const front = sorted.filter(c => !back.includes(c)).slice(0, 2)
    return { back, front }
  }
  return null
}

function handleStraight(sorted, straightHigh, analysis) {
  // Build the straight with the best 5 cards
  const hasJoker = sorted.some(isJoker)
  const ranks = sorted.map(c => isJoker(c) ? 14 : rv(c))
  const unique = [...new Set(ranks)].sort((a, b) => b - a)

  // Find 5 consecutive ranks for the straight
  const straight5 = buildStraight5(sorted, straightHigh, hasJoker)
  if (!straight5) return handleNoPair(sorted)

  const back = straight5
  const front = sorted.filter(c => !back.includes(c)).slice(0, 2)
  return { back, front }
}

function buildStraight5(sorted, high, hasJoker) {
  // Find 5 cards that form the straight with given high card
  const needed = high === 5
    ? [14, 5, 4, 3, 2]  // wheel
    : [high, high-1, high-2, high-3, high-4]

  const result = []
  let jokerUsed = false

  for (const need of needed) {
    const card = sorted.find(c => !result.includes(c) && !isJoker(c) && rv(c) === need)
    if (card) {
      result.push(card)
    } else if (hasJoker && !jokerUsed) {
      result.push(sorted.find(isJoker))
      jokerUsed = true
    } else {
      return null
    }
  }
  return result
}

function handleTrips(sorted, tripRank) {
  const tripCards = sorted.filter(c => c.rank === tripRank).slice(0, 3)
  const others = sorted.filter(c => !tripCards.includes(c)).sort((a, b) => rv(b) - rv(a))

  // Aces: split one ace to front
  if (tripRank === 'A') {
    const front = [tripCards[0], others[0]]
    const back = [...tripCards.slice(1), ...others.slice(1, 4)]
    return { back, front }
  }

  // Otherwise keep trips in back
  const back = [...tripCards, others[0], others[1]]
  const front = [others[2], others[3]]
  return { back, front }
}

function handleThreePair(sorted, pairs) {
  // Three pairs: put highest pair in front, keep lower two pairs in back
  const highPairRank = pairs[0]
  const highPairCards = sorted.filter(c => c.rank === highPairRank).slice(0, 2)
  const back = sorted.filter(c => !highPairCards.includes(c))
  const front = highPairCards
  return { back, front }
}

function handleTwoPair(sorted, pairs) {
  const highPairRank = pairs[0]
  const lowPairRank = pairs[1]
  const hvh = rankValStr(highPairRank)
  const hvl = rankValStr(lowPairRank)

  const highPairCards = sorted.filter(c => c.rank === highPairRank).slice(0, 2)
  const lowPairCards = sorted.filter(c => c.rank === lowPairRank).slice(0, 2)
  const kickers = sorted.filter(c => !highPairCards.includes(c) && !lowPairCards.includes(c))
    .sort((a, b) => rv(b) - rv(a))

  const shouldSplit = decideTwoPairSplit(hvh, hvl, kickers)

  if (shouldSplit) {
    // Split: high pair in back, low pair in front
    const back = [...highPairCards, ...kickers.slice(0, 3)]
    const front = lowPairCards
    return { back, front }
  } else {
    // Don't split: both pairs in back, best kickers in front
    const back = [...highPairCards, ...lowPairCards, kickers[0]]
    const front = kickers.slice(1, 3)
    return { back, front }
  }
}

function decideTwoPairSplit(hvh, hvl, kickers) {
  const topKicker = kickers[0] ? rv(kickers[0]) : 0

  // Aces as high pair: always split
  if (hvh === 14) return true

  // Kings as high pair: always split
  if (hvh === 13) return true

  // Low pair is 10 or higher: always split
  if (hvl >= 10) return true

  // Queens or Jacks as high pair: split unless we have Ace kicker
  if (hvh >= 11 && hvh <= 12) {
    return topKicker < 14 // split if no ace; don't split if ace kicker (ace goes in front)
  }

  // 7s-10s as high pair: split unless King or better kicker
  if (hvh >= 7 && hvh <= 10) {
    return topKicker < 13
  }

  // 6s or lower as high pair: split unless Queen or better kicker
  return topKicker < 12
}

function handleOnePair(sorted, pairRank) {
  const pairCards = sorted.filter(c => c.rank === pairRank).slice(0, 2)
  const others = sorted.filter(c => !pairCards.includes(c)).sort((a, b) => rv(b) - rv(a))
  const back = [...pairCards, ...others.slice(0, 3)]
  const front = others.slice(3, 5)
  return { back, front }
}

function handleNoPair(sorted) {
  // Back: 5 highest; Front: 2nd and 3rd highest (i.e., remaining 2 best cards)
  const back = sorted.slice(0, 5)
  const front = sorted.slice(5, 7)
  return { back, front }
}

// Generate all 5-card combinations from an array
function choose5(cards) {
  const result = []
  const n = cards.length
  for (let a = 0; a < n; a++)
    for (let b = a+1; b < n; b++)
      for (let c = b+1; c < n; c++)
        for (let d = c+1; d < n; d++)
          for (let e = d+1; e < n; e++)
            result.push([cards[a], cards[b], cards[c], cards[d], cards[e]])
  return result
}
