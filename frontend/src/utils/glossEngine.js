// frontend/src/utils/glossEngine.js
// Returns an ordered token stream: [{type:'gloss',value} | {type:'spell',letters} | {type:'drop'}]
// Tries the backend first; if it is offline, translates locally (known -> gloss, unknown -> spell).
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5000';

const STOP = new Set(['A','AN','THE','IS','AM','ARE','WAS','WERE','BE','TO','OF','AND','OR','BUT','SO','IF','THAT','THIS','IT','IN','ON','AT','FOR','WITH']);
const LOCAL = { HELLO:'HELLO', HI:'HELLO', YOU:'YOU', YOUR:'YOUR', ME:'ME', MY:'MY', NAME:'NAME',
  THANKS:'THANKS', THANK:'THANKS', PLEASE:'PLEASE', YES:'YES', NO:'NO', WHAT:'WHAT', WHERE:'WHERE',
  LIKE:'LIKE', LOVE:'LIKE', HELP:'PLEASE', SORRY:'PLEASE', GOOD:'YES', BAD:'NO', FRIEND:'NAME', WANT:'PLEASE', NEED:'PLEASE' };

const norm = (w) => String(w).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const tokenize = (t) => String(t).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);

function offlineTokens(text) {
  return tokenize(text).map((w) => {
    const n = norm(w);
    if (!n) return { type: 'drop' };
    if (STOP.has(n)) return { type: 'drop' };
    if (LOCAL[n]) return { type: 'gloss', value: LOCAL[n] };
    return { type: 'spell', letters: n.split('') }; // unknown -> fingerspell (always works)
  });
}

// Tolerate the OLD backend shape {gloss, unknownWords} just in case.
function legacyToTokens(data) {
  const d = data?.data || data || {};
  const unknown = new Set((d.unknownWords || []).map(norm));
  const out = [];
  if (typeof d.gloss === 'string') for (const w of d.gloss.split(/\s+/)) { const n = norm(w); if (n) out.push({ type: 'gloss', value: n }); }
  for (const u of unknown) if (u) out.push({ type: 'spell', letters: u.split('') });
  return out.length ? out : offlineTokens(d.gloss || '');
}

export async function processSpeechToGloss(transcript) {
  try {
    const res = await fetch(`${API_BASE}/api/translate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: transcript }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data && Array.isArray(data.tokens)) return data.tokens; // new shape
    return legacyToTokens(data);
  } catch (err) {
    console.warn('[glossEngine] backend offline → local mode:', err.message);
    return offlineTokens(transcript);
  }
}

// Legacy exports kept so nothing else breaks.
export const POSE_DICTIONARY = {};
export const filterEnglishStopWords = (text) => tokenize(text).filter((w) => !STOP.has(norm(w))).map(norm);