# HANDOFF — SignBridge v2 (context for AI collaborators)

Read this + open the repo. The user should NOT need to paste code.

## What it does
Spoken English → (Web Speech API) → `POST /api/translate` → backend returns an ordered
token stream → frontend expands it into animation frames → `AvatarCanvas` signs each frame
(gloss word = 1.2s pose, fingerspelled letter = 0.38s handshape, `drop` skipped) while
`speechSynthesis` speaks each token. Head/face add non-manual markers (tilt for questions,
shake for negation, brow/frown morphs if the model has them).

## Translation pipeline (backend/services/translationService.js)
1. `tokenize` the sentence. 2. Per word: `dbService.get(NORM)` (DB-first). 3. Unknown words
   go in ONE batched LLM call (Gemini primary → Groq fallback) that returns one decision per
   input word, same order, type ∈ {gloss, spell, drop}. 4. Each LLM decision is `dbService.set`
   (unique key → no duplicates; persistent in backend/data/signs.json). 5. If both APIs fail,
   unknowns are fingerspelled (not cached) → 100% coverage. 6. Emit `{tokens, provider, fromCache}`.
   The LLM cannot output 3D angles; the DB stores the English→decision mapping (the uncertain
   part). The 3D pose is a pure function of the token, defined in AvatarCanvas.

## Database (backend/services/dbService.js)
Zero-install JSON-file store + in-memory Map. Exports: init/get/set/all/count. Seeded with
stop-words (drop) + common glosses so the app works with NO api keys. Swap to SQLite/Mongo by
replacing ONLY this file (same exports). Uniqueness = Map key (no repeated words).

## Frontend contract
- glossEngine.processSpeechToGloss(text) → token stream (tries backend, else local offline).
- App builds frames (buildFrames) and schedules them; passes `currentToken` ({kind,value}) +
  `nmm` to AvatarCanvas.
- AvatarCanvas maps: letter → ASL_ALPHABET + SPELL_ARM; gloss → RPM_POSES (else FALLBACK_POSE).
  Non-manual markers via `nmm` prop (head bone + optional morphTargetDictionary).

## Wire / token shapes
Backend: { tokens:[ {type:'gloss',value} | {type:'spell',letters:[A-Z]} | {type:'drop'} ], provider, fromCache }
Frame (frontend): { kind:'gloss'|'letter'|'gap', value, hold }

## Config
- `.env` at PROJECT ROOT: GEMINI_API_KEY, GROQ_API_KEY, PORT=5000 (optional GEMINI_MODEL/GROQ_MODEL).
- Backend default port is 5000 (MUST match glossEngine API_BASE). Frontend override: VITE_API_URL.
- avatar.glb (frontend/public) MUST be RIGGED (Mixamo/Ready-Player-Me/Xbot). A static head-scan
  or photoreal mesh with no skeleton will load but never move (findBone needs child.isBone).

## Bone-name contract (AvatarCanvas.findBone keywords)
RightArm: rightarm/armr/upperarmr/shoulderr/mixamorigrightarm · RightForeArm: rightforearm/…/mixamorigrightforearm ·
Left*: leftarm…/leftforearm… · R fingers: righthandindex1…righthandthumb1 (and index1r/handindex1r variants) ·
Head (NMM): mixamorighead/head. Mixamo rigs match after lowercasing + stripping non-alnum.

## Extension points
- New word sign: add to RPM_POSES {arm:{RightArm:[x,y,z],…}, hand:FINGER_SHAPES.X} (Euler rad, lerped 0.1/frame).
- Better alphabet: replace ASL_ALPHABET values with WLASL/HamNoSys-derived bends.
- Real 3D-from-DB: add a `pose` field to dbService decisions + a loader in AvatarCanvas (schema-ready).
- Facial blendshapes: already wired (browInnerUp/browOuterUp/mouthFrown*); just needs a model that has them.

## Invariants the user may re-impose
Earlier the user said "don't touch backend / core logic". In v2 they EXPLICITLY asked to modify
backend + glossEngine + App + AvatarCanvas, so those are now in scope. If a future task says
"don't touch logic" again, treat the pose dicts, findBone, the lerp loop, the DB-first algorithm
and the recognition handlers as off-limits; visual/markup/CSS/lighting/camera remain free.

## Known limits / roadmap
- RPM_POSES covers ~15 glosses; everything else signs via FALLBACK_POSE or fingerspelling.
- Only the RIGHT hand is fingerspelled (left is arm-only).
- ASL_ALPHABET handshapes are approximations, not motion-capture.
- No ASL grammatical reordering (gloss follows English order minus drops) — consistent with the
  original design; the LLM is used per-word with full-sentence context, not for reordering.
- WLASL / HamNoSys integration is the planned path for data-driven poses (not implemented).

## Session changelog (v2)
Replaced: translationService.js, server.js, glossEngine.js, App.jsx, AvatarCanvas.jsx, HANDOFF.md.
New: dbService.js, .env.example, backend/data/signs.json (runtime). Untouched: SpeechInput.jsx,
main.jsx, index.html, styles.css, both package.json. Fixed bugs: port 3000→5000 mismatch,
response-shape mismatch (data.gloss undefined), missing-DB, missing-filename risk.