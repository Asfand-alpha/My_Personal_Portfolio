// Loads server/.env for local development. On Render, env vars come from
// the dashboard instead - this silently does nothing if no .env file exists.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// "gemini-flash-latest" is Google's self-updating alias for their current
// fast/free-tier model (pinned model names like "gemini-2.0-flash" get
// retired over time and start 404ing, which is exactly what happened during
// setup - this alias avoids that going forward).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:4200,http://localhost:4300,https://my-personal-portfolio-137m.onrender.com'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// System prompt lives in a plain text file next to this script, not a
// database - it's not a secret (unlike the API key), just easier to edit
// as its own document than as an inline JS string.
const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.md'), 'utf-8');

if (!GEMINI_API_KEY) {
  console.warn(
    '[chat-server] GEMINI_API_KEY is not set. /api/chat will respond with a fallback error until it is configured.'
  );
}

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, health checks, server-to-server) is allowed
      // through; browser requests are checked against the allowlist.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    }
  })
);

// This endpoint is public (it has to be, the frontend is a static site with
// no auth) so a simple in-memory per-IP cap is the minimum viable protection
// against runaway/abusive usage, even on a free-tier API. It resets on
// restart/deploy - fine for a portfolio site's traffic level.
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages - please try again later.' }
});

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Conversation too long for this session.' });
  }

  const sanitized = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    sanitized.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) });
  }

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'assistant_unavailable' });
  }

  // Gemini's API shape differs from a generic chat API in two ways: turns
  // use role "model" instead of "assistant", and each turn's text sits
  // inside a parts[] array rather than a flat string.
  const contents = sanitized.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { maxOutputTokens: 1024 }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[chat-server] Gemini API error:', response.status, errBody);
      return res.status(502).json({ error: 'assistant_unavailable' });
    }

    const data = await response.json();
    const reply = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');

    if (!reply) {
      return res.status(502).json({ error: 'assistant_unavailable' });
    }

    res.json({ reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[chat-server] Gemini request timed out');
    } else {
      console.error('[chat-server] Unexpected error calling Gemini:', err);
    }
    res.status(502).json({ error: 'assistant_unavailable' });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`[chat-server] listening on port ${PORT}`);
});
