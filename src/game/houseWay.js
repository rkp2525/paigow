import { evaluate5, evaluate2, compareHands } from './handEval.js'

// Optimal dealer hand-setting: enumerate all 21 splits (C(7,2)),
// skip fouls (back must beat front), pick best back then best front.
export function applyHouseWay(cards7) {
  let best = null

  for (let i = 0; i < cards7.length; i++) {
    for (let j = i + 1; j < cards7.length; j++) {
      const front = [cards7[i], cards7[j]]
      const back = cards7.filter((_, k) => k !== i && k !== j)
      const backEval = evaluate5(back)
      const frontEval = evaluate2(front)

      if (compareHands(backEval, frontEval) < 0) continue  // foul

      if (!best) {
        best = { back, front, backEval, frontEval }
        continue
      }

      const backCmp = compareHands(backEval, best.backEval)
      if (backCmp > 0) {
        best = { back, front, backEval, frontEval }
      } else if (backCmp === 0 && compareHands(frontEval, best.frontEval) > 0) {
        best = { back, front, backEval, frontEval }
      }
    }
  }

  return { back: best.back, front: best.front }
}
