// The Express app: middleware and API routes only. It does NOT start a server.
//  - Locally and on a normal Node host, server/src/index.js imports this and calls listen().
//  - On Vercel, api/index.js imports this and Vercel calls it for every /api/* request.
// Add new API routes here so both places get them.
import express from 'express'
import { supabase } from './lib/supabase.js'

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: supabase ? 'configured' : 'not configured' })
})

export default app
