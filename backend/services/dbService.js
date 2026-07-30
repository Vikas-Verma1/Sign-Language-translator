// backend/services/dbService.js
// Zero-install embedded "database": JSON file + in-memory Map.
// Search-first, UNIQUE keys (no duplicate words), persistent across restarts.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'signs.json');

// Words ASL drops (articles / copulas / filler). Stored as {type:'drop'}.
const STOP = ['a','an','the','is','am','are','was','were','be','been','being','to','of',
  'and','or','but','so','if','that','this','it','its','in','on','at','for','with','do','does','did'];

// Common English lemma -> canonical ASL gloss token.
// NOTE: each WH-word now has its OWN sign (who!=what). Old builds cached who->WHAT;
// the migration in init() fixes those cached rows automatically.
const SEED = {
  hello:'HELLO', hi:'HELLO', hey:'HELLO',
  you:'YOU', your:'YOUR', yours:'YOUR',
  me:'ME', my:'MY', mine:'MY',
  name:'NAME', thanks:'THANKS', thank:'THANKS', please:'PLEASE',
  yes:'YES', yeah:'YES', no:'NO', nope:'NO',
  what:'WHAT', where:'WHERE', who:'WHO', why:'WHY', how:'HOW', when:'WHEN',
  like:'LIKE', love:'LIKE', help:'PLEASE', sorry:'PLEASE',
  good:'YES', bad:'NO', friend:'NAME', want:'PLEASE', need:'PLEASE',
  dont:'NO', cant:'NO', wont:'NO', not:'NO',
};

let store = new Map(); // key = NORMALIZED WORD -> decision

function buildSeed() {
  const m = new Map();
  for (const w of STOP) m.set(w.toUpperCase(), { type: 'drop', source: 'seed' });
  for (const [w, value] of Object.entries(SEED)) m.set(w.toUpperCase(), { type: 'gloss', value, source: 'seed' });
  return m;
}

const sameDecision = (a, b) =>
  a && b && a.type === b.type && (a.value || '') === (b.value || '') &&
  JSON.stringify(a.letters || null) === JSON.stringify(b.letters || null);

export function init() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(FILE)) {
    try {
      store = new Map(JSON.parse(readFileSync(FILE, 'utf8')));
      console.log(`📚 [DB] Loaded ${store.size} cached signs from data/signs.json`);

      // MIGRATION: correct stale SEED rows (e.g. WHO was cached as WHAT) WITHOUT
      // touching LLM-learned words (source 'llm' like RAJ, KISHORE, ASHOK...).
      const fresh = buildSeed();
      let migrated = 0;
      for (const [k, v] of fresh) {
        const cur = store.get(k);
        if (cur && cur.source === 'seed' && !sameDecision(cur, v)) {
          store.set(k, { ...v, source: 'seed' });
          migrated++;
        }
      }
      if (migrated) { persist(); console.log(`🔧 [DB] auto-corrected ${migrated} stale seed entries (e.g. WHO)`); }
      return;
    } catch (e) { console.warn('⚠️ [DB] signs.json unreadable, reseeding:', e.message); }
  }

  store = buildSeed();
  persist();
  console.log(`🌱 [DB] Seeded ${store.size} default signs into data/signs.json`);
}

function persist() {
  try { writeFileSync(FILE, JSON.stringify([...store.entries()], null, 2)); }
  catch (e) { console.error('❌ [DB] write failed:', e.message); }
}

// Clean copy (no internal source/savedAt) or null on miss.
export function get(normWord) {
  const d = normWord ? store.get(normWord) : null;
  if (!d) return null;
  return { type: d.type, value: d.value, letters: d.letters };
}

// Unique upsert: same word overwrites -> never duplicated.
export function set(normWord, decision) {
  if (!normWord || !decision) return;
  store.set(normWord, { ...decision, source: decision.source || 'llm', savedAt: new Date().toISOString() });
  persist();
}

export const all = () => Object.fromEntries(store);
export const count = () => store.size;










// // backend/services/dbService.js
// // Zero-install embedded "database": a JSON file + in-memory index.
// // Guarantees: search-first, UNIQUE keys (no duplicate words), persistent across restarts.
// // Swap point: replace this file with a SQLite/Mongo/Postgres implementation
// // keeping the same exports (init/get/set/all/count) and nothing else changes.
// import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
// import { fileURLToPath } from 'node:url';
// import { dirname, join } from 'node:path';

// const __dirname = dirname(fileURLToPath(import.meta.url));
// const DATA_DIR = join(__dirname, '..', 'data');
// const FILE = join(DATA_DIR, 'signs.json');

// // Words ASL drops (articles / copulas / filler). Stored as {type:'drop'}.
// const STOP = ['a','an','the','is','am','are','was','were','be','been','being','to','of',
//   'and','or','but','so','if','that','this','it','its','in','on','at','for','with','do','does','did'];

// // Common English lemma -> canonical ASL gloss token (must exist in AvatarCanvas RPM_POSES or be a known concept).
// const SEED = {
//   hello:'HELLO', hi:'HELLO', hey:'HELLO',
//   you:'YOU', your:'YOUR', yours:'YOUR',
//   me:'ME', my:'MY', mine:'MY',
//   name:'NAME', thanks:'THANKS', thank:'THANKS', please:'PLEASE',
//   yes:'YES', yeah:'YES', no:'NO', nope:'NO',
//   what:'WHAT', where:'WHERE', who:'WHAT', why:'WHAT', how:'WHAT', when:'WHERE',
//   like:'LIKE', love:'LIKE', help:'PLEASE', sorry:'PLEASE',
//   good:'YES', bad:'NO', friend:'NAME', want:'PLEASE', need:'PLEASE',
//   dont:'NO', cant:'NO', wont:'NO', not:'NO',
// };

// let store = new Map(); // key = NORMALIZED WORD (e.g. "HELLO") -> decision

// function buildSeed() {
//   const m = new Map();
//   for (const w of STOP) m.set(w.toUpperCase(), { type: 'drop', source: 'seed' });
//   for (const [w, value] of Object.entries(SEED)) m.set(w.toUpperCase(), { type: 'gloss', value, source: 'seed' });
//   return m;
// }

// export function init() {
//   if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
//   if (existsSync(FILE)) {
//     try {
//       store = new Map(JSON.parse(readFileSync(FILE, 'utf8')));
//       console.log(`📚 [DB] Loaded ${store.size} cached signs from data/signs.json`);
//       return;
//     } catch (e) { console.warn('⚠️ [DB] signs.json unreadable, reseeding:', e.message); }
//   }
//   store = buildSeed();
//   persist();
//   console.log(`🌱 [DB] Seeded ${store.size} default signs into data/signs.json`);
// }

// function persist() {
//   try { writeFileSync(FILE, JSON.stringify([...store.entries()], null, 2)); }
//   catch (e) { console.error('❌ [DB] write failed:', e.message); }
// }

// // Returns a CLEAN copy (no internal source/savedAt) or null on miss.
// export function get(normWord) {
//   const d = normWord ? store.get(normWord) : null;
//   if (!d) return null;
//   return { type: d.type, value: d.value, letters: d.letters };
// }

// // Unique upsert: same word overwrites (updates savedAt) -> never duplicated.
// export function set(normWord, decision) {
//   if (!normWord || !decision) return;
//   store.set(normWord, { ...decision, source: decision.source || 'llm', savedAt: new Date().toISOString() });
//   persist();
// }

// export const all = () => Object.fromEntries(store);
// export const count = () => store.size;