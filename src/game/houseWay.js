import { evaluate5, evaluate2, compareHands, HR } from './handEval.js'
import { isJoker, RANK_VALUE } from './cards.js'

// Standard casino house way for Pai Gow Poker, modeled on the
// Foxwoods / Wizard-of-Odds simplified rules. The dealer's split is
// deterministic from the seven cards — no win-rate optimization.
//
// Joker semantics (Pai Gow Poker): joker is "semi-wild" — it completes
// a straight, flush, or straight flush, otherwise it plays as an ace.
// This module always prefers the higher use; rule dispatch is in order
// of 5-card hand rank, and detection for higher patterns consumes the
// joker first.

const ACE = 14

function rankVal(card) {
  return isJoker(card) ? ACE : RANK_VALUE[card.rank]
}

function jokerOf(cards) {
  return cards.find(isJoker)
}

function naturalsOf(cards) {
  return cards.filter(c => !isJoker(c))
}

function sortByRankDesc(cards) {
  return [...cards].sort((a, b) => rankVal(b) - rankVal(a))
}

function cardsOfRank(cards, rankValue) {
  return cards.filter(c => !isJoker(c) && RANK_VALUE[c.rank] === rankValue)
}

// Group natural cards by rank → { rankValue: [cards] }.
function groupByRank(cards) {
  const m = new Map()
  for (const c of naturalsOf(cards)) {
    const r = RANK_VALUE[c.rank]
    if (!m.has(r)) m.set(r, [])
    m.get(r).push(c)
  }
  return m
}

function findStraightFlush(cards7) {
  const j = jokerOf(cards7)
  const bySuit = {}
  for (const c of naturalsOf(cards7)) {
    if (!bySuit[c.suit]) bySuit[c.suit] = []
    bySuit[c.suit].push(c)
  }

  let best = null
  for (const cs of Object.values(bySuit)) {
    if (cs.length + (j ? 1 : 0) < 5) continue
    const ranksHere = new Set(cs.map(c => RANK_VALUE[c.rank]))

    for (let high = ACE; high >= 5; high--) {
      const ranks = high === 5
        ? [ACE, 5, 4, 3, 2]
        : [high, high - 1, high - 2, high - 3, high - 4]
      const missing = ranks.filter(r => !ranksHere.has(r))
      let cards
      if (missing.length === 0) {
        cards = ranks.map(r => cs.find(c => RANK_VALUE[c.rank] === r))
      } else if (missing.length === 1 && j) {
        cards = ranks.map(r => r === missing[0] ? j : cs.find(c => RANK_VALUE[c.rank] === r))
      } else {
        continue
      }
      const evald = evaluate5(cards)
      if (!best || compareHands(evald, best.eval) > 0) best = { cards, eval: evald }
      break // highest in this suit found
    }
  }
  return best ? best.cards : null
}

function findFlush(cards7) {
  const j = jokerOf(cards7)
  const bySuit = {}
  for (const c of naturalsOf(cards7)) {
    if (!bySuit[c.suit]) bySuit[c.suit] = []
    bySuit[c.suit].push(c)
  }

  let best = null
  for (const cs of Object.values(bySuit)) {
    const have = cs.length + (j ? 1 : 0)
    if (have < 5) continue
    const sorted = sortByRankDesc(cs)
    const cards = cs.length >= 5 ? sorted.slice(0, 5) : [...sorted.slice(0, 4), j]
    const evald = evaluate5(cards)
    if (!best || compareHands(evald, best.eval) > 0) best = { cards, eval: evald }
  }
  return best ? best.cards : null
}

function findStraight(cards7) {
  const j = jokerOf(cards7)
  const naturals = naturalsOf(cards7)
  const ranksHere = new Set(naturals.map(c => RANK_VALUE[c.rank]))

  for (let high = ACE; high >= 5; high--) {
    const ranks = high === 5
      ? [ACE, 5, 4, 3, 2]
      : [high, high - 1, high - 2, high - 3, high - 4]
    const missing = ranks.filter(r => !ranksHere.has(r))
    if (missing.length === 0) {
      return ranks.map(r => cardsOfRank(naturals, r)[0])
    }
    if (missing.length === 1 && j) {
      return ranks.map(r => r === missing[0] ? j : cardsOfRank(naturals, r)[0])
    }
  }
  return null
}

// Classify the 7 cards into one of the house way dispatch types.
function classify(cards7) {
  const j = jokerOf(cards7)
  const byRank = groupByRank(cards7)
  const naturalAces = byRank.get(ACE)?.length || 0
  const aces = byRank.get(ACE) || []

  // Natural-only pair / trip / quad enumeration.
  const quads = [], trips = [], pairs = []
  for (const [r, cs] of byRank.entries()) {
    if (cs.length === 4) quads.push(r)
    else if (cs.length === 3) trips.push(r)
    else if (cs.length === 2) pairs.push(r)
  }
  quads.sort((a, b) => b - a)
  trips.sort((a, b) => b - a)
  pairs.sort((a, b) => b - a)

  // 1. Five aces (4 natural aces + joker).
  if (j && naturalAces === 4) {
    return { type: 'FIVE_ACES', aces: [...aces, j] }
  }

  // 2. Straight flush (consumes joker if needed).
  const sf = findStraightFlush(cards7)
  if (sf) return { type: 'STRAIGHT_FLUSH', cards: sf }

  // 3. Four of a kind. Natural quads, OR 3 natural aces + joker as 4th ace.
  if (quads.length > 0) {
    return { type: 'FOUR_KIND', quadCards: cardsOfRank(cards7, quads[0]) }
  }
  if (j && naturalAces === 3) {
    return { type: 'FOUR_KIND', quadCards: [...aces, j] }
  }

  // Trips (natural) or trips via 2 aces + joker.
  let tripRank = null, tripCards = null
  if (trips.length > 0) {
    tripRank = trips[0]
    tripCards = cardsOfRank(cards7, tripRank)
  } else if (j && naturalAces === 2) {
    tripRank = ACE
    tripCards = [...aces, j]
  }

  // Pairs visible to the dealer. Joker pairs with a single natural ace.
  // (If we already have a natural ace pair, the joker upgrades it to trips
  // — handled above — so this branch only fires for exactly one natural ace.)
  const allPairs = [...pairs]
  const jokerAcePair = !!j && naturalAces === 1 && !pairs.includes(ACE) && tripRank !== ACE
  if (jokerAcePair) allPairs.push(ACE)
  allPairs.sort((a, b) => b - a)

  // 4. Full house: trips + a different pair. When two natural trip ranks exist,
  // the lower trip plays as a pair.
  if (tripRank !== null) {
    let pairRank = null
    for (const r of pairs) if (r !== tripRank) { pairRank = r; break }
    if (pairRank === null && trips.length >= 2) {
      pairRank = trips[1] === tripRank ? null : trips[1]
    }
    if (pairRank !== null) {
      const pairCards = cardsOfRank(cards7, pairRank).slice(0, 2)
      return { type: 'FULL_HOUSE', tripCards, pairCards }
    }
  }

  // 5. Three pair (rare; only possible with 6 paired cards + 1 leftover).
  if (allPairs.length >= 3) {
    return { type: 'THREE_PAIR', pairRanks: allPairs, jokerAcePair }
  }

  // 6. Flush or straight (with two-pair override).
  const flush = findFlush(cards7)
  const straight = !flush ? findStraight(cards7) : null
  if (flush || straight) {
    if (allPairs.length >= 2) {
      return { type: 'TWO_PAIR', pairRanks: allPairs, jokerAcePair }
    }
    return {
      type: flush ? 'FLUSH' : 'STRAIGHT',
      cards: flush || straight,
      pairRank: allPairs[0] ?? null,
      jokerAcePair,
    }
  }

  // 7. Three of a kind (no concurrent pair → no full house).
  if (tripRank !== null) {
    return { type: 'THREE_KIND', tripRank, tripCards }
  }

  // 8. Two pair.
  if (allPairs.length >= 2) {
    return { type: 'TWO_PAIR', pairRanks: allPairs, jokerAcePair }
  }

  // 9. One pair.
  if (allPairs.length === 1) {
    const r = allPairs[0]
    const pairCards = r === ACE && jokerAcePair ? [aces[0], j] : cardsOfRank(cards7, r)
    return { type: 'ONE_PAIR', pairCards }
  }

  return { type: 'NO_PAIR' }
}

function pairCardsFor(cards7, rank, jokerAcePair) {
  if (rank === ACE && jokerAcePair) {
    const aces = cardsOfRank(cards7, ACE)
    const j = jokerOf(cards7)
    return [aces[0], j]
  }
  return cardsOfRank(cards7, rank).slice(0, 2)
}

// Five aces: keep all five in back; the two leftover cards play in front.
function splitFiveAces(cards7, p) {
  const back = p.aces
  const front = cards7.filter(c => !back.includes(c))
  return { back, front: sortByRankDesc(front) }
}

// Straight flush: back is the five SF cards. The remaining two cards go to
// front; if they form a natural pair, that pair plays in front naturally.
function splitStraightFlush(cards7, p) {
  const back = p.cards
  const front = cards7.filter(c => !back.includes(c))
  return { back, front: sortByRankDesc(front) }
}

// Four of a kind: keep all four in back; play the two highest singletons
// in front. A more aggressive house way splits high quads, but most
// published tables keep the quads together when the singletons include
// an ace or face card to play in front.
function splitFourKind(cards7, p) {
  const remaining = sortByRankDesc(cards7.filter(c => !p.quadCards.includes(c)))
  const front = [remaining[0], remaining[1]]
  const back = [...p.quadCards, remaining[2]]
  return { back, front }
}

// Full house: split into trips back + pair front. (When there is a third
// pair — i.e. trips + two pair — the lower pair joins the trips in back
// to form a full house, and the higher pair plays in front.)
function splitFullHouse(cards7, p) {
  const placed = new Set([...p.tripCards, ...p.pairCards])
  const leftover = cards7.filter(c => !placed.has(c))
  return { back: [...p.tripCards, ...leftover], front: p.pairCards }
}

// Three pair: highest pair in front, the two lower pairs (= two pair) in
// back, with the lone singleton as the 5th back card.
function splitThreePair(cards7, p) {
  const [hi, mid, lo] = p.pairRanks
  const front = pairCardsFor(cards7, hi, p.jokerAcePair)
  const midPair = pairCardsFor(cards7, mid, p.jokerAcePair)
  const loPair = pairCardsFor(cards7, lo, p.jokerAcePair)
  const placed = new Set([...front, ...midPair, ...loPair])
  const remaining = cards7.filter(c => !placed.has(c))
  return { back: [...midPair, ...loPair, ...remaining], front }
}

// Flush / straight: keep the five-card hand in back. If a single pair
// exists outside the run and the leftover two cards naturally include
// that pair, it becomes the front automatically. Otherwise the leftover
// two cards play as a high-card front.
function splitFlushOrStraight(cards7, p) {
  const back = p.cards
  const remaining = cards7.filter(c => !back.includes(c))
  return { back, front: sortByRankDesc(remaining) }
}

// Three of a kind:
//   - Trips of aces: SPLIT. Pair of aces in back, single ace + highest
//     kicker in front. (Pair of aces in back is still strong; a lone ace
//     is the best possible high-card front.)
//   - Trips 2 through K: keep in back; play 2 highest singletons in front.
function splitThreeKind(cards7, p) {
  const remaining = sortByRankDesc(cards7.filter(c => !p.tripCards.includes(c)))
  if (p.tripRank === ACE) {
    const [aceA, aceB, aceC] = p.tripCards
    const backPair = [aceA, aceB]
    const front = [aceC, remaining[0]]
    return { back: [...backPair, remaining[1], remaining[2], remaining[3]], front }
  }
  return {
    back: [...p.tripCards, remaining[2], remaining[3]],
    front: [remaining[0], remaining[1]],
  }
}

// Two pair: split-vs-keep depends on the higher pair's rank.
//   - High pair K or A: ALWAYS SPLIT (high pair back, low pair front).
//   - High pair 7–Q: SPLIT unless the singletons include an ace
//     (with an ace the dealer keeps both pairs in back and plays A+kicker
//     in front).
//   - High pair 2–6: KEEP both pairs in back; play the two highest
//     singletons in front.
function splitTwoPair(cards7, p) {
  const [hiRank, loRank] = p.pairRanks
  const hiPair = pairCardsFor(cards7, hiRank, p.jokerAcePair)
  const loPair = pairCardsFor(cards7, loRank, p.jokerAcePair)
  const placed = new Set([...hiPair, ...loPair])
  const remaining = sortByRankDesc(cards7.filter(c => !placed.has(c)))
  const topSingleton = remaining[0]
  const hasAceSingleton = topSingleton && rankVal(topSingleton) === ACE

  let split
  if (hiRank >= 13) split = true              // K or A — always split
  else if (hiRank >= 7) split = !hasAceSingleton
  else split = false                          // 2–6 — keep both

  if (split) {
    return {
      back: [...hiPair, remaining[0], remaining[1], remaining[2]],
      front: loPair,
    }
  }
  return {
    back: [...hiPair, ...loPair, remaining[2]],
    front: [remaining[0], remaining[1]],
  }
}

// One pair: pair in back, two highest singletons in front.
function splitOnePair(cards7, p) {
  const remaining = sortByRankDesc(cards7.filter(c => !p.pairCards.includes(c)))
  return {
    back: [...p.pairCards, remaining[2], remaining[3], remaining[4]],
    front: [remaining[0], remaining[1]],
  }
}

// No pair: 2nd and 3rd highest cards in front; highest plus the lower
// four in back. This is the standard "spread the high cards" rule —
// it keeps the strongest singleton in back (giving a high-card back a
// chance) while still leaving a respectable front.
function splitNoPair(cards7) {
  const sorted = sortByRankDesc(cards7)
  return {
    back: [sorted[0], sorted[3], sorted[4], sorted[5], sorted[6]],
    front: [sorted[1], sorted[2]],
  }
}

export function applyHouseWay(cards7) {
  const p = classify(cards7)
  switch (p.type) {
    case 'FIVE_ACES':      return splitFiveAces(cards7, p)
    case 'STRAIGHT_FLUSH': return splitStraightFlush(cards7, p)
    case 'FOUR_KIND':      return splitFourKind(cards7, p)
    case 'FULL_HOUSE':     return splitFullHouse(cards7, p)
    case 'THREE_PAIR':     return splitThreePair(cards7, p)
    case 'FLUSH':          return splitFlushOrStraight(cards7, p)
    case 'STRAIGHT':       return splitFlushOrStraight(cards7, p)
    case 'THREE_KIND':     return splitThreeKind(cards7, p)
    case 'TWO_PAIR':       return splitTwoPair(cards7, p)
    case 'ONE_PAIR':       return splitOnePair(cards7, p)
    default:               return splitNoPair(cards7)
  }
}
