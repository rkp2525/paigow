import { RANK_VALUE, isJoker } from './cards.js'

// Hand rank constants
export const HR = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_KIND: 8,
  STRAIGHT_FLUSH: 9,
  FIVE_ACES: 10,
}

export const HR_NAMES = {
  1: 'High Card',
  2: 'One Pair',
  3: 'Two Pair',
  4: 'Three of a Kind',
  5: 'Straight',
  6: 'Flush',
  7: 'Full House',
  8: 'Four of a Kind',
  9: 'Straight Flush',
  10: 'Five Aces',
}

function getRankValue(rank) {
  return RANK_VALUE[rank] ?? 0
}

// Replace joker with the most useful card for a given hand context.
// Returns an array of concrete rank values (14=Ace etc.) for the hand,
// with the joker substituted for the best possible card.
function resolveJoker(cards) {
  const hasJoker = cards.some(isJoker)
  const concreteCards = cards.filter(c => !isJoker(c))
  const concreteRanks = concreteCards.map(c => getRankValue(c.rank)).sort((a, b) => b - a)
  const concreteSuits = concreteCards.map(c => c.suit)

  if (!hasJoker) {
    return { ranks: concreteRanks, suits: concreteSuits, jokerUsedAs: null }
  }

  if (cards.length === 2) {
    // In 2-card hand, joker always = Ace
    return { ranks: [14, ...concreteRanks].sort((a, b) => b - a), suits: concreteSuits, jokerUsedAs: 14 }
  }

  // Try to complete a flush first
  const suitCounts = {}
  for (const s of concreteSuits) suitCounts[s] = (suitCounts[s] || 0) + 1
  const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s] >= 4)
  if (flushSuit) {
    // Joker completes the flush — pick the highest rank not already in flush cards
    // For simplicity, treat joker as Ace of flush suit (highest value)
    return { ranks: [14, ...concreteRanks].sort((a, b) => b - a), suits: [...concreteSuits, flushSuit], jokerUsedAs: 14, jokerSuit: flushSuit }
  }

  // Try to complete a straight
  const straightRank = bestStraightWithJoker(concreteRanks)
  if (straightRank !== null) {
    return { ranks: [straightRank, ...concreteRanks].sort((a, b) => b - a), suits: concreteSuits, jokerUsedAs: straightRank }
  }

  // Default: joker = Ace
  return { ranks: [14, ...concreteRanks].sort((a, b) => b - a), suits: concreteSuits, jokerUsedAs: 14 }
}

function bestStraightWithJoker(concreteRanks) {
  // Find if adding one card (any rank) makes a straight from the 4 concrete cards
  const rankSet = new Set(concreteRanks)
  // Try each possible rank 2-14 as joker
  for (let r = 14; r >= 2; r--) {
    if (rankSet.has(r)) continue
    const trial = [...concreteRanks, r].sort((a, b) => b - a)
    if (isStraightRanks(trial.slice(0, 5))) return r
  }
  // Wheel: A-2-3-4-5 (A=14, treated as 1)
  return null
}

function isStraightRanks(sortedRanks) {
  if (sortedRanks.length < 5) return false
  const r = sortedRanks.slice(0, 5)
  // Normal straight
  if (r[0] - r[4] === 4 && new Set(r).size === 5) return true
  // Wheel: A-2-3-4-5 (A=14 acts as 1)
  if (r[0] === 14 && r[1] === 5 && r[2] === 4 && r[3] === 3 && r[4] === 2) return true
  return false
}

function getStraightHighCard(sortedRanks) {
  const r = sortedRanks.slice(0, 5)
  if (r[0] === 14 && r[1] === 5 && r[2] === 4 && r[3] === 3 && r[4] === 2) return 5 // wheel = 5-high
  return r[0]
}

// Count occurrences of each rank value
function rankCounts(ranks) {
  const counts = {}
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1
  return counts
}

// Evaluate a 5-card hand. Returns { rank, tiebreakers, name }
export function evaluate5(cards) {
  if (cards.length !== 5) throw new Error(`evaluate5 requires 5 cards, got ${cards.length}`)

  const { ranks, suits, jokerSuit } = resolveJoker(cards)
  const sortedRanks = [...ranks].sort((a, b) => b - a)

  // Determine suits after joker resolution
  const effectiveSuits = jokerSuit
    ? [...cards.filter(c => !isJoker(c)).map(c => c.suit), jokerSuit]
    : cards.map(c => c.suit)

  const allSameSuit = new Set(effectiveSuits).size === 1

  // Five Aces: 4 natural aces + joker (joker = ace = 14 repeated 5 times)
  const counts = rankCounts(sortedRanks)
  if (sortedRanks.length === 5 && counts[14] === 5) {
    return { rank: HR.FIVE_ACES, tiebreakers: [14, 14, 14, 14, 14], name: 'Five Aces' }
  }

  const isStraight = isStraightRanks(sortedRanks)
  const straightHigh = isStraight ? getStraightHighCard(sortedRanks) : null

  if (allSameSuit && isStraight) {
    if (straightHigh === 14) {
      return { rank: HR.STRAIGHT_FLUSH, tiebreakers: [14], name: 'Royal Flush' }
    }
    return { rank: HR.STRAIGHT_FLUSH, tiebreakers: [straightHigh], name: 'Straight Flush' }
  }

  const countValues = Object.values(counts).sort((a, b) => b - a)
  const ranksByCount = Object.entries(counts)
    .map(([r, c]) => [Number(r), c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])

  if (countValues[0] === 4) {
    const quadRank = ranksByCount[0][0]
    const kicker = ranksByCount[1][0]
    return { rank: HR.FOUR_KIND, tiebreakers: [quadRank, kicker], name: 'Four of a Kind' }
  }

  if (countValues[0] === 3 && countValues[1] === 2) {
    const triRank = ranksByCount[0][0]
    const pairRank = ranksByCount[1][0]
    return { rank: HR.FULL_HOUSE, tiebreakers: [triRank, pairRank], name: 'Full House' }
  }

  if (allSameSuit) {
    return { rank: HR.FLUSH, tiebreakers: sortedRanks, name: 'Flush' }
  }

  if (isStraight) {
    return { rank: HR.STRAIGHT, tiebreakers: [straightHigh], name: 'Straight' }
  }

  if (countValues[0] === 3) {
    const triRank = ranksByCount[0][0]
    const kickers = ranksByCount.slice(1).map(([r]) => r).sort((a, b) => b - a)
    return { rank: HR.THREE_KIND, tiebreakers: [triRank, ...kickers], name: 'Three of a Kind' }
  }

  if (countValues[0] === 2 && countValues[1] === 2) {
    const high = ranksByCount[0][0]
    const low = ranksByCount[1][0]
    const kicker = ranksByCount[2][0]
    return { rank: HR.TWO_PAIR, tiebreakers: [high, low, kicker], name: 'Two Pair' }
  }

  if (countValues[0] === 2) {
    const pairRank = ranksByCount[0][0]
    const kickers = ranksByCount.slice(1).map(([r]) => r).sort((a, b) => b - a)
    return { rank: HR.ONE_PAIR, tiebreakers: [pairRank, ...kickers], name: 'One Pair' }
  }

  return { rank: HR.HIGH_CARD, tiebreakers: sortedRanks, name: 'High Card' }
}

// Evaluate a 2-card hand. Only ONE_PAIR or HIGH_CARD.
export function evaluate2(cards) {
  if (cards.length !== 2) throw new Error(`evaluate2 requires 2 cards, got ${cards.length}`)
  const { ranks } = resolveJoker(cards)
  const sorted = [...ranks].sort((a, b) => b - a)
  if (sorted[0] === sorted[1]) {
    return { rank: HR.ONE_PAIR, tiebreakers: [sorted[0]], name: 'One Pair' }
  }
  return { rank: HR.HIGH_CARD, tiebreakers: sorted, name: 'High Card' }
}

// Compare two evaluated hands. Returns positive if h1 > h2, negative if h1 < h2, 0 if tie.
export function compareHands(h1, h2) {
  if (h1.rank !== h2.rank) return h1.rank - h2.rank
  for (let i = 0; i < Math.max(h1.tiebreakers.length, h2.tiebreakers.length); i++) {
    const a = h1.tiebreakers[i] ?? 0
    const b = h2.tiebreakers[i] ?? 0
    if (a !== b) return a - b
  }
  return 0
}

// Check if dealer has ace-high pai gow (worst possible hand = no pairs, no flush, no straight)
export function isAceHighPaiGow(dealerBack5, dealerFront2) {
  const backEval = evaluate5(dealerBack5)
  return backEval.rank === HR.HIGH_CARD && backEval.tiebreakers[0] === 14
}

// Determine round outcome. Returns 'WIN', 'PUSH', or 'LOSS'.
// Dealer wins ties (both tied = player loses; one tied one won = push).
export function determineOutcome(playerBack, playerFront, dealerBack, dealerFront) {
  // Ace-high pai gow check
  const dealerBackEval = evaluate5(dealerBack)
  if (dealerBackEval.rank === HR.HIGH_CARD && dealerBackEval.tiebreakers[0] === 14) {
    return 'PUSH' // Ace-high pai gow: all bets push
  }

  const pBackEval = evaluate5(playerBack)
  const pFrontEval = evaluate2(playerFront)
  const dFrontEval = evaluate2(dealerFront)

  const backResult = compareHands(pBackEval, dealerBackEval)  // >0 player wins back
  const frontResult = compareHands(pFrontEval, dFrontEval)    // >0 player wins front

  const playerWinsBack = backResult > 0
  const playerWinsFront = frontResult > 0
  // Ties go to dealer
  const dealerWinsBack = backResult <= 0
  const dealerWinsFront = frontResult <= 0

  if (playerWinsBack && playerWinsFront) return 'WIN'
  if (dealerWinsBack && dealerWinsFront) return 'LOSS'
  return 'PUSH'
}

// Get the best possible 5-card and 2-card hands from 7 cards using house way
// (Used only for checking ace-high pai gow from ANY 5-card arrangement)
export function bestFiveCardHand(cards7) {
  let best = null
  for (let i = 0; i < cards7.length; i++) {
    for (let j = i + 1; j < cards7.length; j++) {
      const five = cards7.filter((_, idx) => idx !== i && idx !== j)
      const evald = evaluate5(five)
      if (!best || compareHands(evald, best) > 0) {
        best = evald
      }
    }
  }
  return best
}
