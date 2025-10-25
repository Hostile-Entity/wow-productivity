import { useEffect, useState } from 'react';
import { addAmount, getBalance } from './db';
import './styles.css';

export default function App() {
  const [balance, setBalance] = useState<number>(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getBalance().then(setBalance).catch(console.error);
  }, []);

  async function onAdd() {
    try {
      setPending(true);
      const next = await addAmount(10);
      setBalance(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="app">
      <div className="card">
        <h1 className="h1">Test App</h1>
        <p className="muted">Tap to add +10</p>
        <div className="balance">{balance}</div>
        <button className="btn" onClick={onAdd} disabled={pending} aria-label="Add ten">
          {pending ? 'Adding…' : '+10'}
        </button>
        <div className="subtle">Offline‑first • PWA • IndexedDB</div>
      </div>
    </div>
  );
}