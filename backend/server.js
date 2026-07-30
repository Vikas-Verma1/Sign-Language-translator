// backend/server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { translateToASL } from './services/translationService.js';
import * as db from './services/dbService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') }); // project root
dotenv.config({ path: path.join(__dirname, '.env') });    // backend/ (fallback)

db.init(); // load or seed the database BEFORE serving requests

const app = express();
app.use(cors());
app.use(express.json());

console.log('\n=== Environment ===');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Loaded ✅' : 'MISSING ❌ (unknown words will be fingerspelled)');
console.log('GROQ_API_KEY:  ', process.env.GROQ_API_KEY ? 'Loaded ✅' : 'MISSING ❌ (Groq fallback disabled)');
console.log('===================\n');

app.get('/api/health', (req, res) => res.json({ ok: true, signs: db.count() }));

app.get('/api/test-config', (req, res) => res.json({
  geminiKeyStatus: process.env.GEMINI_API_KEY ? 'Key Found' : 'Missing',
  groqKeyStatus: process.env.GROQ_API_KEY ? 'Key Found' : 'Missing',
  cachedSigns: db.count(),
}));

// Inspect the database (every cached word -> its sign decision)
app.get('/api/signs', (req, res) => res.json({ count: db.count(), signs: db.all() }));

// Main translation route -> returns { tokens, provider, fromCache }
app.post('/api/translate', async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: "Provide a 'text' string." });
  try {
    const response = await translateToASL(String(text));
    console.log(`📥 "${text}" → [${response.provider}] ${response.tokens.map((t) => t.type === 'spell' ? `(${t.letters.join('')})` : t.value || '·').join(' ')}`);
    res.json(response);
  } catch (error) {
    console.error('💥 Server Error:', error.message);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
});

const PORT = process.env.PORT || 5000; // MUST match the frontend (5000)
app.listen(PORT, () => console.log(`🌐 Backend running at http://localhost:${PORT}`));






// import express from 'express';
// import cors from 'cors';

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Converts raw English text to basic ASL Gloss structure
// app.post('/api/translate', (req, res) => {
//   const { text } = req.body;
//   if (!text) return res.status(400).json({ error: 'No text provided' });

//   // Basic NLP rule engine for ASL syntax (Time + Subject + Object + Verb)
//   let cleaned = text.toLowerCase().replace(/[^\w\s]/gi, '');
//   let words = cleaned.split(' ');

//   // Filter out stop words that ASL omits
//   const stopWords = new Set(['is', 'are', 'am', 'the', 'a', 'an', 'to', 'of']);
//   let glossTokens = words.filter(w => !stopWords.has(w)).map(w => w.toUpperCase());

//   res.json({ original: text, gloss: glossTokens });
// });

// const PORT = 5000;
// app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

// // const PORT = process.env.PORT || 5000;
// // app.listen(PORT, '0.0.0.0', () => {
// //   console.log(`Server running on port ${PORT}`);
// // });