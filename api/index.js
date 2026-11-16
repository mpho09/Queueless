// Vercel serverless entry point: every /api/* request is rewritten here (see vercel.json).
// It just hands the request to the same Express app that runs locally (server/src/app.js).
import app from '../server/src/app.js'

export default app
