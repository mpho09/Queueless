import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { supabase } from './lib/supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: supabase ? 'configured' : 'not configured' })
})

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
