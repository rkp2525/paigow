import { makeDeck, shuffle } from './cards.js'
import { applyHouseWay } from './houseWay.js'
import { evaluate5, evaluate2, compareHands, HR } from './handEval.js'

export const PHASE = {
  BETTING: 'BETTING',
  SETTING: 'SETTING',
  RESULT: 'RESULT',
}

export const DEFAULT_WALLET = 500
export const MIN_BET = 5
export const BET_INCREMENT = 5

export function createInitialState(wallet = DEFAULT_WALLET) {
  return {
    phase: PHASE.BETTING,
    wallet,
    bet: MIN_BET,
    deck: [],
    playerCards: [],     // all 7 player cards
    playerBack: [],      // player's 5-card back hand (set by player)
    playerFront: [],     // player's 2-card front hand (set by player)
    dealerCards: [],     // all 7 dealer cards
    dealerBack: [],      // dealer's 5-card back hand (set by house way)
    dealerFront: [],     // dealer's 2-card front hand (set by house way)
    outcome: null,       // 'WIN' | 'PUSH' | 'LOSS'
    isAceHighPaiGow: false,
    isFoul: false,
    backResult: null,    // 'WIN' | 'TIE' | 'LOSS' (player vs dealer back)
    frontResult: null,
    handHistory: [],     // [{outcome, bet, wallet}]
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

  // Foul check: player's back hand must be at least as strong as front hand
  const pBackEval = evaluate5(playerBack)
  const pFrontEval = evaluate2(playerFront)
  if (compareHands(pBackEval, pFrontEval) < 0) {
    const newWallet = wallet - bet
    const entry = { outcome: 'LOSS', bet, walletAfter: newWallet }
    return {
      ...state,
      phase: PHASE.RESULT,
      wallet: newWallet,
      outcome: 'LOSS',
      isFoul: true,
      isAceHighPaiGow: false,
      backResult: 'LOSS',
      frontResult: 'LOSS',
      handHistory: [entry, ...state.handHistory].slice(0, 50),
    }
  }

  // Ace-high pai gow check on dealer's back hand
  const dealerBackEval = evaluate5(dealerBack)
  const isAceHighPaiGow = dealerBackEval.rank === HR.HIGH_CARD && dealerBackEval.tiebreakers[0] === 14

  if (isAceHighPaiGow) {
    const entry = { outcome: 'PUSH', bet, walletAfter: wallet }
    return {
      ...state,
      phase: PHASE.RESULT,
      outcome: 'PUSH',
      isAceHighPaiGow: true,
      backResult: 'TIE',
      frontResult: 'TIE',
      handHistory: [entry, ...state.handHistory].slice(0, 50),
    }
  }

  const dFrontEval = evaluate2(dealerFront)

  const backCmp = compareHands(pBackEval, dealerBackEval)
  const frontCmp = compareHands(pFrontEval, dFrontEval)

  const playerWinsBack = backCmp > 0
  const playerWinsFront = frontCmp > 0
  // Ties go to dealer
  const backResult = backCmp > 0 ? 'WIN' : backCmp === 0 ? 'TIE' : 'LOSS'
  const frontResult = frontCmp > 0 ? 'WIN' : frontCmp === 0 ? 'TIE' : 'LOSS'

  let outcome
  let newWallet = wallet
  if (playerWinsBack && playerWinsFront) {
    outcome = 'WIN'
    newWallet = wallet + bet
  } else if (!playerWinsBack && !playerWinsFront) {
    outcome = 'LOSS'
    newWallet = wallet - bet
  } else {
    outcome = 'PUSH'
  }

  const entry = { outcome, bet, walletAfter: newWallet }
  return {
    ...state,
    phase: PHASE.RESULT,
    wallet: newWallet,
    outcome,
    isFoul: false,
    isAceHighPaiGow: false,
    backResult,
    frontResult,
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
    backResult: null,
    frontResult: null,
    isAceHighPaiGow: false,
  }
}
