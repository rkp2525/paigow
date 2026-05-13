import { useState } from 'react'
import { DEFAULT_WALLET, MIN_BET } from '../game/gameLogic.js'

export default function SettingsModal({ wallet, onSave, onCancel }) {
  const [value, setValue] = useState(String(wallet))

  function handleSave() {
    const n = parseInt(value, 10)
    if (isNaN(n) || n < MIN_BET) return
    onSave(n)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Reset Wallet</h2>
        <p>Set your starting balance:</p>
        <div className="modal-presets">
          {[100, 250, 500, 1000, 2500].map(v => (
            <button key={v} className={`preset-btn${parseInt(value) === v ? ' preset-active' : ''}`}
              onClick={() => setValue(String(v))}>
              ${v}
            </button>
          ))}
        </div>
        <input
          type="number"
          className="modal-input"
          value={value}
          min={MIN_BET}
          step={5}
          onChange={e => setValue(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={handleSave}>Set Balance</button>
        </div>
      </div>
    </div>
  )
}
