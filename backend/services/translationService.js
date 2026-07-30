// backend/services/translationService.js
import { get as dbGet, set as dbSet } from './dbService.js';

let lastProvider = 'cache';

const norm = (w) => String(w).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const tokenize = (t) => String(t).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);

const spellDecision = (w) => {
  const L = norm(w).split('').filter((c) => /[A-Z0-9]/.test(c));
  return L.length ? { type: 'spell', letters: L } : { type: 'drop' };
};
const decisionToToken = (d) => {
  if (!d || d.type === 'drop') return { type: 'drop' };
  if (d.type === 'spell') return { type: 'spell', letters: d.letters || [] };
  return { type: 'gloss', value: d.value || '' };
};

const buildPrompt = (words) => `
You are an expert ASL gloss engine. I give an ordered list of spoken English words. Return ONE decision per word, SAME order, echoing the SAME "word". Never reorder/add/remove.
- type "drop" for words ASL omits (a, an, the, is, am, are, was, were, to, of, and, or, but, so, if, that, this, it, in, on, at, for, with).
- type "gloss" for words with a standard ASL sign; value = UPPERCASE canonical token (lemma in caps, e.g. "run"->"RUN", "don't"->"DONT").
- type "spell" for proper nouns, names, places, brands, technical/rare words; letters = UPPERCASE A-Z array.
Output ONLY JSON: {"decisions":[{"word":"my","type":"gloss","value":"MY"},{"word":"alex","type":"spell","letters":["A","L","E","X"]}]}
Words: ${JSON.stringify(words)}
`;

function parseLLMJSON(raw) {
  let c = String(raw).trim();
  if (c.startsWith('```')) c = c.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(c);
}
function validate(e) {
  if (!e || typeof e !== 'object') return null;
  const t = String(e.type || '').toLowerCase();
  if (t === 'drop') return { type: 'drop' };
  if (t === 'gloss') { const v = norm(e.value || e.word || ''); return v ? { type: 'gloss', value: v } : null; }
  if (t === 'spell' || t === 'fingerspell') {
    let L = (Array.isArray(e.letters) ? e.letters : String(e.value || e.word || '').split(''))
      .map((x) => String(x).toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean);
    if (!L.length) L = norm(e.word || '').split('').filter((c) => /[A-Z]/.test(c));
    return L.length ? { type: 'spell', letters: L } : null;
  }
  return null;
}
function align(parsed, words) {
  const decs = (parsed && Array.isArray(parsed.decisions)) ? parsed.decisions : Array.isArray(parsed) ? parsed : null;
  if (!decs) throw new Error('unexpected LLM schema');
  const byWord = new Map(); for (const d of decs) if (d && d.word) byWord.set(String(d.word).toLowerCase(), d);
  return words.map((w, i) => validate(byWord.get(w.toLowerCase()) ?? decs[i]));
}

// ---- Gemini with model fallback chain ----
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash')
  .split(',').map((s) => s.trim()).filter(Boolean);
let geminiCooldownUntil = 0;
const isQuota = (m) => /quota|rate.?limit|resource.?exhausted|limit:\s*0|\b429\b/i.test(m || '');

async function callGeminiModel(model, prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: 'application/json' } }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || `HTTP ${r.status}`);
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('empty Gemini response');
  return parseLLMJSON(txt);
}
async function callGemini(prompt) {
  const errs = [];
  for (const model of GEMINI_MODELS) {
    try { return await callGeminiModel(model, prompt); }
    catch (e) { errs.push(`${model}: ${e.message}`); if (isQuota(e.message)) break; /* quota is account-wide, stop trying models */ }
  }
  throw new Error(errs.join(' | '));
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || `HTTP ${r.status}`);
  const txt = data.choices?.[0]?.message?.content;
  if (!txt) throw new Error('empty Groq response');
  return parseLLMJSON(txt);
}

async function callLLMAligned(words) {
  const prompt = buildPrompt(words);
  const geminiOff = process.env.GEMINI_DISABLED === '1' || Date.now() < geminiCooldownUntil;
  if (!geminiOff) {
    try { const parsed = await callGemini(prompt); lastProvider = 'Gemini'; return align(parsed, words); }
    catch (e1) {
      if (isQuota(e1.message)) { geminiCooldownUntil = Date.now() + 60_000; console.warn(`⚠️ [Gemini quota] cooldown 60s → Groq`); }
      else console.warn(`⚠️ [Gemini failed] ${e1.message} → Groq`);
    }
  }
  try { const parsed = await callGroq(prompt); lastProvider = 'Groq'; return align(parsed, words); }
  catch (e2) { throw new Error(`Gemini skipped/failed; Groq: ${e2.message}`); }
}

export async function translateToASL(text) {
  const words = tokenize(text);
  if (!words.length) return { tokens: [], provider: 'none', fromCache: true };

  const decisions = words.map((w) => dbGet(norm(w)));
  const missIdx = decisions.map((d, i) => (d ? null : i)).filter((i) => i !== null);
  let provider = 'cache';

  if (missIdx.length) {
    try {
      const llm = await callLLMAligned(words);
      for (const i of missIdx) {
        const d = llm[i];
        if (d) { decisions[i] = d; dbSet(norm(words[i]), d); }
        else decisions[i] = spellDecision(words[i]);
      }
      provider = lastProvider;
    } catch (err) {
      console.warn(`❌ [LLM unavailable] ${err.message} → fingerspelling unknowns`);
      for (const i of missIdx) decisions[i] = spellDecision(words[i]);
      provider = 'fallback-spell';
    }
  }
  return { tokens: decisions.map(decisionToToken), provider, fromCache: missIdx.length === 0 };
}