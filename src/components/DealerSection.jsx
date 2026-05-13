import Card from './Card.jsx'
import HandLabel from './HandLabel.jsx'
import { sortByRankDesc } from '../game/cards.js'

export default function DealerSection({ dealerFront, dealerBack, backResult, frontResult, revealed }) {
  const front = revealed ? sortByRankDesc(dealerFront) : dealerFront
  const back = revealed ? sortByRankDesc(dealerBack) : dealerBack

  return (
    <div className="dealer-section">
      <div className="section-title">Dealer</div>

      <div className="hand-group">
        <div className="hand-sublabel">Front Hand (2-card)</div>
        <div className="card-row">
          {revealed
            ? front.map(c => <Card key={c.id} card={c} small />)
            : [0, 1].map(i => <Card key={i} faceDown small />)
          }
        </div>
        {revealed && <HandLabel cards={front} is2Card result={frontResult} />}
      </div>

      <div className="hand-group">
        <div className="hand-sublabel">Back Hand (5-card)</div>
        <div className="card-row">
          {revealed
            ? back.map(c => <Card key={c.id} card={c} small />)
            : [0, 1, 2, 3, 4].map(i => <Card key={i} faceDown small />)
          }
        </div>
        {revealed && <HandLabel cards={back} is2Card={false} result={backResult} />}
      </div>
    </div>
  )
}
