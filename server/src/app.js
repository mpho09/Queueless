// The Express app: middleware and API routes only. It does NOT start a server.
//  - Locally and on a normal Node host, server/src/index.js imports this and calls listen().
//  - On Vercel, api/index.js imports this and Vercel calls it for every /api/* request.
// Add new API routes here so both places get them.
 
import express from 'express'
import { supabase } from './lib/supabase.js'
import { requireUser } from './middleware/requireUser.js'
import { createSavingsRouter } from './routes/savings.js'
import { createAccountRouter } from './routes/account.js'
import { createSuburbsRouter } from './routes/suburbs.js'

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: supabase ? 'configured' : 'not configured' })
})

// Public & user-scoped routes
app.use('/api', createSuburbsRouter({ requireUser }))

// Routes that need a logged-in user get `requireUser`, which answers 401 without a valid token.
app.use('/api', createSavingsRouter({ requireUser }))
app.use('/api', createAccountRouter({ requireUser }))

export default app
