import { makeDeck, shuffle, isJoker, RANK_VALUE } from './cards.js'
import { applyHouseWay } from './houseWay.js'
import { evaluate5, evaluate2, compareHands, HR, bestFiveCardHand } from './handEval.js'

export const PHASE = {
  BETTING: 'BETTING',
  SETTING: 'SETTING',
  RESULT: 'RESULT',
}

export const DEFAULT_WALLET = 500
export const MIN_BET = 5
export const BET_INCREMENT = 5
export const SIDE_BET_AMOUNT = 5

// Pai Gow Insurance: pays when player's 7 cards form a pai gow (all singletons).
// Multiplier based on highest card rank. A lower high card is rarer and pays more;
// any pai gow with a 9-high or lower pays the top rate.
export const PAI_GOW_PAY = { 14: 3, 13: 5, 12: 7, 11: 15, 10: 25 }
export const PAI_GOW_DEFAULT_PAY = 100 // high card 9 or lower

// Fortune: pays when player's best 5-card hand from 7 cards is 3-of-a-kind or better.
export const FORTUNE_PAY = {
  [HR.THREE_KIND]: 3,
  [HR.STRAIGHT]: 2,
  [HR.FLUSH]: 4,
  [HR.FULL_HOUSE]: 5,
  [HR.FOUR_KIND]: 25,
  [HR.STRAIGHT_FLUSH]: 50, // royal flush handled separately below
  [HR.FIVE_ACES]: 400,
}
export const ROYAL_FLUSH_PAY = 150 // ace-high straight flush, instead of 50:1

// Returns { highCardRank, highCardName, multiplier } if player has a pai gow, else null.
export function evalPaiGowSide(playerCards) {
  const best = bestFiveCardHand(playerCards)
  if (best.rank !== HR.HIGH_CARD) return null
  const highRank = Math.max(...playerCards.map(c => isJoker(c) ? 14 : (RANK_VALUE[c.rank] ?? 0)))
  const multiplier = PAI_GOW_PAY[highRank] ?? PAI_GOW_DEFAULT_PAY
  const names = { 14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten',
    9: 'Nine', 8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two' }
  return { highCardRank: highRank, highCardName: `${names[highRank] ?? highRank} High`, multiplier }
}

// Returns { handName, handRank, multiplier } if player's best 5-of-7 is 3-of-a-kind+, else null.
export function evalFortuneSide(playerCards) {
  const best = bestFiveCardHand(playerCards)
  if (best.rank < HR.THREE_KIND) return null
  let multiplier = FORTUNE_PAY[best.rank] ?? 0
  // Royal flush (straight flush with ace high) pays 150:1 instead of 50:1
  if (best.rank === HR.STRAIGHT_FLUSH && best.tiebreakers[0] === 14) multiplier = ROYAL_FLUSH_PAY
  if (!multiplier) return null
  return { handName: best.name, handRank: best.rank, multiplier }
}

export function createInitialState(wallet = DEFAULT_WALLET) {
  return {
    phase: PHASE.BETTING,
    wallet,
    bet: MIN_BET,
    deck: [],
    playerCards: [],        // all 7 player cards
    playerBack: [],         // player's 5-card back hand (set by player)
    playerFront: [],        // player's 2-card front hand (set by player)
    dealerCards: [],        // all 7 dealer cards
    dealerBack: [],         // dealer's 5-card back hand (set by house way)
    dealerFront: [],        // dealer's 2-card front hand (set by house way)
    outcome: null,          // 'WIN' | 'PUSH' | 'LOSS'
    isAceHighPaiGow: false,
    isFoul: false,
    foulBackName: null,
    foulFrontName: null,
    backResult: null,       // 'WIN' | 'TIE' | 'LOSS' (player vs dealer back)
    frontResult: null,
    coachingHint: null,     // { bestOutcome, backName, frontName } when player could have done better
    paiGowSideBet: false,   // player is placing the Pai Gow Insurance side bet
    fortuneSideBet: false,  // player is placing the Fortune side bet
    paiGowSideResult: null, // { highCardName, multiplier } if qualified, else null
    fortuneSideResult: null,// { handName, multiplier } if qualified, else null
    handHistory: [],        // [{outcome, bet, walletAfter, ...side bet stats}]
  }
}

export function dealRound(state) {
  const deck = shuffle(makeDeck())
  const playerCards = deck.slice(0, 7)
  const dealerCards = deck.slice(7, 14)

  // Dealer sets hands via house way immediately
  const { back: dealerBack, front: dealerFront } = applyHouseWay(dealerCards)

  // Player starts with all cards unset (will set in SETTING phase)
  return {
    ...state,
    phase: PHASE.SETTING,
    deck: deck.slice(14),
    playerCards,
    playerBack: [],
    playerFront: [],
    dealerCards,
    dealerBack,
    dealerFront,
    outcome: null,
    backResult: null,
    frontResult: null,
    paiGowSideResult: null,
    fortuneSideResult: null,
    coachingHint: null,
    isAceHighPaiGow: false,
  }
}

export function setPlayerHand(state, back5, front2) {
  return { ...state, playerBack: back5, playerFront: front2 }
}

export function resolveRound(state) {
  const { playerBack, playerFront, dealerBack, dealerFront, bet, wallet } = state
  if (playerBack.length !== 5 || playerFront.length !== 2) {
    throw new Error('Player hand not fully set')
  }

  // Side bets are always evaluated (shown even when not placed)
  const paiGowSideResult = evalPaiGowSide(state.playerCards)
  const fortuneSideResult = evalFortuneSide(state.playerCards)

  function sideNetChange() {
    let net = 0
    if (state.paiGowSideBet) {
      net += paiGowSideResult ? SIDE_BET_AMOUNT * paiGowSideResult.multiplier : -SIDE_BET_AMOUNT
    }
    if (state.fortuneSideBet) {
      net += fortuneSideResult ? SIDE_BET_AMOUNT * fortuneSideResult.multiplier : -SIDE_BET_AMOUNT
    }
    return net
  }

  function mkEntry(outcome, mainWalletChange, extra) {
    const walletAfter = wallet + mainWalletChange + sideNetChange()
    return {
      outcome, bet, walletAfter,
      paiGowSidePlaced: state.paiGowSideBet,
      paiGowSideWon: !!paiGowSideResult,
      paiGowSideMultiplier: paiGowSideResult?.multiplier ?? 0,
      fortuneSidePlaced: state.fortuneSideBet,
      fortuneSideWon: !!fortuneSideResult,
      fortuneSideMultiplier: fortuneSideResult?.multiplier ?? 0,
      playerBack, playerFront, dealerBack, dealerFront,
      ...extra,
    }
  }

  // Foul check: player's back hand must be at least as strong as front hand
  const pBackEval = evaluate5(playerBack)
  const pFrontEval = evaluate2(playerFront)
  if (compareHands(pBackEval, pFrontEval) < 0) {
    const entry = mkEntry('LOSS', -bet, {
      isFoul: true, isAceHighPaiGow: false, backResult: 'LOSS', frontResult: 'LOSS',
    })
    return {
      ...state,
      phase: PHASE.RESULT,
      wallet: entry.walletAfter,
      outcome: 'LOSS',
      isFoul: true,
      foulBackName: pBackEval.name,
      foulFrontName: pFrontEval.name,
      isAceHighPaiGow: false,
      backResult: 'LOSS',
      frontResult: 'LOSS',
      paiGowSideResult,
      fortuneSideResult,
      coachingHint: findCoachingHint(state.playerCards, dealerBack, dealerFront, 'LOSS'),
      handHistory: [entry, ...state.handHistory].slice(0, 50),
    }
  }

  // Ace-high pai gow check on dealer's back hand (base game: automatic push)
  const dealerBackEval = evaluate5(dealerBack)
  const isAceHighPaiGow = dealerBackEval.rank === HR.HIGH_CARD && dealerBackEval.tiebreakers[0] === 14

  if (isAceHighPaiGow) {
    const entry = mkEntry('PUSH', 0, {
      isFoul: false, isAceHighPaiGow: true, backResult: 'TIE', frontResult: 'TIE',
    })
    return {
      ...state,
      phase: PHASE.RESULT,
      wallet: entry.walletAfter,
      outcome: 'PUSH',
      isAceHighPaiGow: true,
      backResult: 'TIE',
      frontResult: 'TIE',
      paiGowSideResult,
      fortuneSideResult,
      coachingHint: null,
      handHistory: [entry, ...state.handHistory].slice(0, 50),
    }
  }

  const dFrontEval = evaluate2(dealerFront)
  const backCmp = compareHands(pBackEval, dealerBackEval)
  const frontCmp = compareHands(pFrontEval, dFrontEval)

  const playerWinsBack = backCmp > 0
  const playerWinsFront = frontCmp > 0
  const backResult = backCmp > 0 ? 'WIN' : backCmp === 0 ? 'TIE' : 'LOSS'
  const frontResult = frontCmp > 0 ? 'WIN' : frontCmp === 0 ? 'TIE' : 'LOSS'

  let outcome
  let mainChange = 0
  if (playerWinsBack && playerWinsFront) { outcome = 'WIN'; mainChange = bet }
  else if (!playerWinsBack && !playerWinsFront) { outcome = 'LOSS'; mainChange = -bet }
  else { outcome = 'PUSH' }

  const entry = mkEntry(outcome, mainChange, {
    isFoul: false, isAceHighPaiGow: false, backResult, frontResult,
  })
  return {
    ...state,
    phase: PHASE.RESULT,
    wallet: entry.walletAfter,
    outcome,
    isFoul: false,
    isAceHighPaiGow: false,
    backResult,
    frontResult,
    paiGowSideResult,
    fortuneSideResult,
    coachingHint: findCoachingHint(state.playerCards, dealerBack, dealerFront, outcome),
    handHistory: [entry, ...state.handHistory].slice(0, 50),
  }
}

export function nextRound(state) {
  return {
    ...state,
    phase: PHASE.BETTING,
    playerCards: [],
    playerBack: [],
    playerFront: [],
    dealerCards: [],
    dealerBack: [],
    dealerFront: [],
    outcome: null,
    isFoul: false,
    foulBackName: null,
    foulFrontName: null,
    backResult: null,
    frontResult: null,
    paiGowSideResult: null,
    fortuneSideResult: null,
    coachingHint: null,
    isAceHighPaiGow: false,
    // paiGowSideBet and fortuneSideBet are intentionally preserved
  }
}

const OUTCOME_RANK = { WIN: 2, PUSH: 1, LOSS: 0 }

// Enumerate all C(7,2)=21 splits and return the best achievable outcome
// against the dealer's already-set hands. Returns null if no split beats
// actualOutcome (i.e. the player already played optimally or equally well).
export function findCoachingHint(playerCards, dealerBack, dealerFront, actualOutcome) {
  const dealerBackEval = evaluate5(dealerBack)
  const dealerFrontEval = evaluate2(dealerFront)
  const n = playerCards.length
  let best = null

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const front = [playerCards[i], playerCards[j]]
      const back = playerCards.filter((_, k) => k !== i && k !== j)

      const backEval = evaluate5(back)
      const frontEval = evaluate2(front)
      if (compareHands(backEval, frontEval) < 0) continue // foul — skip

      const backCmp = compareHands(backEval, dealerBackEval)
      const frontCmp = compareHands(frontEval, dealerFrontEval)

      let outcome
      if (backCmp > 0 && frontCmp > 0) outcome = 'WIN'
      else if (backCmp <= 0 && frontCmp <= 0) outcome = 'LOSS'
      else outcome = 'PUSH'

      if (
        OUTCOME_RANK[outcome] > OUTCOME_RANK[actualOutcome] &&
        (best === null || OUTCOME_RANK[outcome] > OUTCOME_RANK[best.bestOutcome])
      ) {
        best = { bestOutcome: outcome, backName: backEval.name, frontName: frontEval.name }
      }
    }
  }

  return best
}
