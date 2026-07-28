// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import SpeechInput from './components/SpeechInput';
import AvatarCanvas from './components/AvatarCanvas';
import { processSpeechToGloss } from './utils/glossEngine';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [glossQueue, setGlossQueue] = useState([]);
  const [activeGloss, setActiveGloss] = useState('');

  /* ===================== CORE LOGIC — UNCHANGED ===================== */
  useEffect(() => {
    if (activeGloss && activeGloss !== 'REST' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeGloss.toLowerCase());
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [activeGloss]);

  const handleTranscript = async (text) => {
    setTranscript(text);
    const glosses = await processSpeechToGloss(text);
    setGlossQueue(glosses);
    glosses.forEach((token, index) => {
      setTimeout(() => { setActiveGloss(token); }, index * 1200);
    });
    setTimeout(() => { setActiveGloss('REST'); }, glosses.length * 1200);
  };
  /* =================== /CORE LOGIC — UNCHANGED =================== */

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🤟</span>
          <div>
            <h1>Sign<span>Bridge</span></h1>
            <p>Real-time Audio → ASL Avatar</p>
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
            <div className="field-label">ASL gloss sequence</div>
            <div className="gloss">
              {glossQueue.length > 0
                ? glossQueue.map((t, i) => (
                    <span key={i} className={'chip' + (t === activeGloss ? ' chip--active' : '')}>{t}</span>
                  ))
                : <span className="muted">Awaiting speech input…</span>}
            </div>
          </div>

          <div className="sign-card">
            <span className="sign-card-label">Now signing</span>
            <span className="token">{activeGloss || 'REST'}</span>
          </div>
        </section>

        <section className="panel panel--stage">
          <div className="stage"><AvatarCanvas currentGloss={activeGloss} /></div>
          <div className="stage-hud">
            <span><i className="dot" /> WebGL · PBR skin</span>
            <span>React + Three.js</span>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Web Speech API · client-side ASL gloss engine</span>
        <span>Express backend on :5000</span>
      </footer>
    </div>
  );
}