import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Converts raw English text to basic ASL Gloss structure
app.post('/api/translate', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // Basic NLP rule engine for ASL syntax (Time + Subject + Object + Verb)
  let cleaned = text.toLowerCase().replace(/[^\w\s]/gi, '');
  let words = cleaned.split(' ');

  // Filter out stop words that ASL omits
  const stopWords = new Set(['is', 'are', 'am', 'the', 'a', 'an', 'to', 'of']);
  let glossTokens = words.filter(w => !stopWords.has(w)).map(w => w.toUpperCase());

  res.json({ original: text, gloss: glossTokens });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));