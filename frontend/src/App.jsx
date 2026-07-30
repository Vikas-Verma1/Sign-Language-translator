// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import SpeechInput from './components/SpeechInput';
import AvatarCanvas from './components/AvatarCanvas';
import SpellingHand from './components/SpellingHand';
import { processSpeechToGloss } from './utils/glossEngine';

const HOLD_GLOSS = 1300;   // a full-word sign
const HOLD_LETTER = 750;   // one fingerspelled letter (readable)
const HOLD_GAP = 320;      // pause between spelled words
const NEG = new Set(['NO', 'NOT', 'DONT', 'DOESNT', 'CANT', 'WONT', 'NEVER']);

function buildFrames(tokens) {
  const frames = [];
  for (const t of tokens || []) {
    if (t.type === 'drop') continue;
    if (t.type === 'gloss') frames.push({ kind: 'gloss', value: String(t.value || '').toUpperCase(), hold: HOLD_GLOSS });
    else if (t.type === 'spell' && Array.isArray(t.letters)) {
      for (const L of t.letters) frames.push({ kind: 'letter', value: String(L).toUpperCase(), hold: HOLD_LETTER });
      frames.push({ kind: 'gap', value: '·', hold: HOLD_GAP });
    }
  }
  return frames;
}

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [frames, setFrames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [nmm, setNmm] = useState(null);
  const activeToken = activeIndex >= 0 ? frames[activeIndex] : null;
  const spelling = activeToken?.kind === 'letter';

  useEffect(() => {
    if (!activeToken || activeToken.kind === 'gap' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(activeToken.value.toLowerCase());
    u.rate = 1.0; u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }, [activeToken]);

  const handleTranscript = async (text) => {
    setTranscript(text);
    const tokens = await processSpeechToGloss(text);
    const built = buildFrames(tokens);
    setFrames(built);
    setActiveIndex(-1);
    setNmm(/\?/.test(text) ? 'question' : (tokens.some((t) => t.type === 'gloss' && NEG.has(t.value)) ? 'negation' : null));
    let acc = 0;
    built.forEach((f, i) => { setTimeout(() => setActiveIndex(i), acc); acc += f.hold; });
    setTimeout(() => { setActiveIndex(-1); setNmm(null); }, acc);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🤟</span>
          <div>
            <h1>Sign<span>Bridge</span></h1>
            <p>Real-time Audio → ASL Avatar · DB-cached · LLM-powered</p>
          </div>
        </div>
        <span className="badge"><i className="dot" /> Live engine</span>
      </header>

      <main className="layout">
        <section className="panel panel--controls">
          <SpeechInput onTranscript={handleTranscript} />
          <div className="field">
            <div className="field-label">Spoken speech</div>
            <div className="transcript">{transcript || 'Press the mic and speak a sentence…'}</div>
          </div>
          <div className="field">
            <div className="field-label">ASL gloss + fingerspelling</div>
            <div className="gloss">
              {frames.length > 0
                ? frames.map((f, i) => (
                    <span key={i} className={'chip' + (f.kind === 'letter' ? ' chip--spell' : '') + (i === activeIndex ? ' chip--active' : '') + (f.kind === 'gap' ? ' chip--gap' : '')}>
                      {f.value}
                    </span>
                  ))
                : <span className="muted">Awaiting speech input…</span>}
            </div>
          </div>
          <div className="sign-card">
            <span className="sign-card-label">{spelling ? 'Fingerspelling' : 'Now signing'}</span>
            <span className="token">{activeToken ? activeToken.value : 'REST'}</span>
          </div>
        </section>

        <section className="panel panel--stage">
          <div className="stage"><AvatarCanvas currentToken={activeToken} nmm={nmm} /></div>
          <SpellingHand letter={activeToken?.value} visible={spelling} />
          <div className="stage-hud">
            <span><i className="dot" /> WebGL · your avatar · inset spelling hand</span>
            <span>React + Three.js</span>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Web Speech API · DB-first gloss engine · Gemini→Groq</span>
        <span>Express backend on :5000</span>
      </footer>
    </div>
  );
}








// // frontend/src/App.jsx
// import React, { useState, useEffect } from 'react';
// import SpeechInput from './components/SpeechInput';
// import AvatarCanvas from './components/AvatarCanvas';
// import { processSpeechToGloss } from './utils/glossEngine';

// const HOLD_GLOSS = 1200;  // ms a full-word sign is held
// const HOLD_LETTER = 380;  // ms per fingerspelled letter
// const HOLD_GAP = 220;     // pause between spelled words
// const NEG = new Set(['NO', 'NOT', 'DONT', 'DOESNT', 'CANT', 'WONT', 'NEVER']);

// // Flatten the backend token stream into a linear list of animation frames.
// function buildFrames(tokens) {
//   const frames = [];
//   for (const t of tokens || []) {
//     if (t.type === 'drop') continue;
//     if (t.type === 'gloss') frames.push({ kind: 'gloss', value: String(t.value || '').toUpperCase(), hold: HOLD_GLOSS });
//     else if (t.type === 'spell' && Array.isArray(t.letters)) {
//       for (const L of t.letters) frames.push({ kind: 'letter', value: String(L).toUpperCase(), hold: HOLD_LETTER });
//       frames.push({ kind: 'gap', value: '·', hold: HOLD_GAP });
//     }
//   }
//   return frames;
// }

// export default function App() {
//   const [transcript, setTranscript] = useState('');
//   const [frames, setFrames] = useState([]);
//   const [activeIndex, setActiveIndex] = useState(-1);
//   const [nmm, setNmm] = useState(null); // non-manual marker: 'question' | 'negation' | null

//   const activeToken = activeIndex >= 0 ? frames[activeIndex] : null;

//   // Speak each token as it becomes active (letters are spoken by name).
//   useEffect(() => {
//     if (!activeToken || activeToken.kind === 'gap' || !('speechSynthesis' in window)) return;
//     window.speechSynthesis.cancel();
//     const u = new SpeechSynthesisUtterance(activeToken.value.toLowerCase());
//     u.rate = 1.0; u.pitch = 1.0;
//     window.speechSynthesis.speak(u);
//   }, [activeToken]);

//   const handleTranscript = async (text) => {
//     setTranscript(text);
//     const tokens = await processSpeechToGloss(text);
//     const built = buildFrames(tokens);
//     setFrames(built);
//     setActiveIndex(-1);
//     setNmm(/\?/.test(text) ? 'question' : (tokens.some((t) => t.type === 'gloss' && NEG.has(t.value)) ? 'negation' : null));

//     // Schedule every frame with cumulative timing.
//     let acc = 0;
//     built.forEach((f, i) => { setTimeout(() => setActiveIndex(i), acc); acc += f.hold; });
//     setTimeout(() => { setActiveIndex(-1); setNmm(null); }, acc); // return to REST
//   };

//   return (
//     <div className="app">
//       <header className="topbar">
//         <div className="brand">
//           <span className="brand-mark">🤟</span>
//           <div>
//             <h1>Sign<span>Bridge</span></h1>
//             <p>Real-time Audio → ASL Avatar · DB-cached · LLM-powered</p>
//           </div>
//         </div>
//         <span className="badge"><i className="dot" /> Live engine</span>
//       </header>

//       <main className="layout">
//         <section className="panel panel--controls">
//           <SpeechInput onTranscript={handleTranscript} />

//           <div className="field">
//             <div className="field-label">Spoken speech</div>
//             <div className="transcript">{transcript || 'Press the mic and speak a sentence…'}</div>
//           </div>

//           <div className="field">
//             <div className="field-label">ASL gloss + fingerspelling</div>
//             <div className="gloss">
//               {frames.length > 0
//                 ? frames.map((f, i) => (
//                     <span key={i} className={'chip' + (f.kind === 'letter' ? ' chip--spell' : '') + (i === activeIndex ? ' chip--active' : '') + (f.kind === 'gap' ? ' chip--gap' : '')}>
//                       {f.value}
//                     </span>
//                   ))
//                 : <span className="muted">Awaiting speech input…</span>}
//             </div>
//           </div>

//           <div className="sign-card">
//             <span className="sign-card-label">{activeToken?.kind === 'letter' ? 'Fingerspelling' : 'Now signing'}</span>
//             <span className="token">{activeToken ? activeToken.value : 'REST'}</span>
//           </div>
//         </section>

//         <section className="panel panel--stage">
//           <div className="stage"><AvatarCanvas currentToken={activeToken} nmm={nmm} /></div>
//           <div className="stage-hud">
//             <span><i className="dot" /> WebGL · PBR skin · A–Z alphabet</span>
//             <span>React + Three.js</span>
//           </div>
//         </section>
//       </main>

//       <footer className="footer">
//         <span>Web Speech API · DB-first gloss engine · Gemini→Groq</span>
//         <span>Express backend on :5000</span>
//       </footer>
//     </div>
//   );
// }