export const SUITS = ['S', 'H', 'D', 'C']
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const JOKER = 'JK'

export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' }
export const SUIT_COLORS = { S: 'black', H: 'red', D: 'red', C: 'black' }

// Numeric rank value for comparison (2=2 ... A=14, Joker=15 treated contextually)
export const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, 'JK': 15
}

let _nextId = 0

export function makeCard(rank, suit) {
  return { id: _nextId++, rank, suit }
}

export function makeDeck() {
  _nextId = 0
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit))
    }
  }
  deck.push(makeCard(JOKER, null))
  return deck
}

export function shuffle(deck) {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function isJoker(card) {
  return card.rank === JOKER
}

export function rankValue(card) {
  return RANK_VALUE[card.rank] ?? 0
}

export function cardLabel(card) {
  if (isJoker(card)) return 'JK'
  return card.rank
}

export function cardKey(card) {
  return `${card.rank}-${card.suit ?? 'J'}`
}
