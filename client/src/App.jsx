import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('checking…')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className="app">
      <h1>Queueless</h1>
      <p>
        API status: <strong>{status}</strong>
      </p>
    </main>
  )
}
