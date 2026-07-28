# HANDOFF — context for AI collaborators

> Read this + open the repo files. You do **not** need the user to paste code.

## 1. What the app does
Spoken English → (Web Speech API) → text → `glossEngine.processSpeechToGloss` → ASL gloss
tokens → `App` queues them and sets `activeGloss` every 1200 ms → `AvatarCanvas` maps the
token to a pose and lerps the avatar's bones → `speechSynthesis` speaks the token.

## 2. Data flow & ownership
- `SpeechInput` owns recognition; calls `onTranscript(text)`.
- `App` owns `transcript`, `glossQueue`, `activeGloss`; owns the timing + TTS effect.
- `glossEngine` owns English→gloss rules (client-side; backend is NOT in this path).
- `AvatarCanvas` owns the three.js scene, model loading, bone discovery, and the lerp loop.
  It receives `currentGloss` and selects a pose from `RPM_POSES` (fallback `FALLBACK_POSE`).

## 3. The bone-name contract (CRITICAL)
`AvatarCanvas.findBone()` lower-cases a bone name, strips non-alphanumerics, then checks
`includes()` against keyword lists. A model animates **only if** its joint names contain the
right substrings AND the model has a real **skin/skeleton** (otherwise three.js's GLTFLoader
does not mark nodes as `isBone`, and `findBone` returns null). See `docs/AVATAR.md` for the
full keyword table and the "why the old head-scan failed" explanation.

## 4. INVARIANTS — DO NOT CHANGE unless the task explicitly says so
- Backend files (`backend/**`).
- `glossEngine.js` algorithm.
- `App.jsx`: the `useEffect` (TTS), `handleTranscript`, the 1200 ms timings, the state shape.
- `AvatarCanvas.jsx`: `FINGER_SHAPES`, `RPM_POSES`, `FALLBACK_POSE`, `findBone`, the
  `detectedBones` keyword table, the interpolation `animate()` loop, the `currentGloss` effect,
  the component's props (`{ currentGloss }`).
- `SpeechInput.jsx`: recognition create/start/stop/onresult/onerror/onend handlers.
Visual/markup/CSS/lighting/camera changes around these are allowed (and were done in the
"Step 1 / Step 2" update). The boundary is marked in-code with
`/* === CORE LOGIC — UNCHANGED === */` vs `/* === VISUAL ONLY === */`.

## 5. Current state after the Step 1 / Step 2 update
- UI redesigned (glassmorphism, gradient brand, gloss chips that highlight the active token,
  pulsing mic, responsive single-column under 880px, reduced-motion support).
- Avatar scene beautified: ACES tone-mapping, RoomEnvironment PBR, 3-point lighting,
  transparent renderer over a CSS radial gradient, **upper-body auto-framing** (works for any
  rig; tweak `focusY` factor `0.68` and camera `z = 1.9` to re-crop).
- Added `frontend/tools/make-avatar.mjs` (rigged mannequin generator → `public/avatar.glb`).
- The user MUST replace the old head-scan `avatar.glb` (no rig) with a rigged model, else
  nothing animates.

## 6. Known limitations / open work (roadmap)
- Pose dictionary covers ~12 glosses; unknown words use `FALLBACK_POSE`. Expanding it means
  editing `RPM_POSES` (the documented extension point — shape: `{ arm:{RightArm:[x,y,z],…}, hand: FINGER_SHAPES.X }`).
- Only the **right** hand has finger bones driven; left hand is arm-only.
- Pose values were authored without a real rig to validate against, so signs may look rough /
  possibly mirror-flipped depending on the rig's facing. Mirror fix = flip camera sign (visual).
- Backend `/api/translate` is commented out; translation is client-side. Enabling server-side
  translation is a **backend** change (out of scope per the project rule).
- No orbit controls wired (the HUD mentions drag as a placeholder); add `OrbitControls` if wanted
  (visual, not core logic).

## 7. Conventions
ESM everywhere (`"type":"module"`); Vite dev server; three 0.165 (`three/examples/jsm/...`);
CSS is plain (no preprocessor); no test suite yet.

## 8. Session changelog (what the last update touched)
Changed: `AvatarCanvas.jsx` (visual/integration), `App.jsx` (markup), `SpeechInput.jsx`
(markup + additive `supported`), `styles.css` (rewrite), `index.html` (fonts/meta).
Added: `frontend/tools/make-avatar.mjs`, `README.md`, `docs/HANDOFF.md`, `docs/AVATAR.md`.
Untouched: `backend/**`, `glossEngine.js`, `main.jsx`.