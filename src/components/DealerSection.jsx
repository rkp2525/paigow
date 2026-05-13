import Card from './Card.jsx'
import HandLabel from './HandLabel.jsx'

export default function DealerSection({ dealerFront, dealerBack, backResult, frontResult, revealed }) {
  return (
    <div className="dealer-section">
      <div className="section-title">Dealer</div>

      <div className="hand-group">
        <div className="hand-sublabel">Front Hand (2-card)</div>
        <div className="card-row">
          {revealed
            ? dealerFront.map(c => <Card key={c.id} card={c} small />)
            : [0, 1].map(i => <Card key={i} faceDown small />)
          }
        </div>
        {revealed && <HandLabel cards={dealerFront} is2Card result={frontResult} />}
      </div>

      <div className="hand-group">
        <div className="hand-sublabel">Back Hand (5-card)</div>
        <div className="card-row">
          {revealed
            ? dealerBack.map(c => <Card key={c.id} card={c} small />)
            : [0, 1, 2, 3, 4].map(i => <Card key={i} faceDown small />)
          }
        </div>
        {revealed && <HandLabel cards={dealerBack} is2Card={false} result={backResult} />}
      </div>
    </div>
  )
}
