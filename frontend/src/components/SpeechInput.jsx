// frontend/src/components/SpeechInput.jsx
import React, { useState, useEffect } from 'react';

export default function SpeechInput({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [supported, setSupported] = useState(true); // additive UX-only flag

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        onTranscript(text);
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    } else {
      setSupported(false); // additive: show inline message instead of only an alert
    }
  }, [onTranscript]);

  const toggleListen = () => {
    if (!recognition) {
      alert('Web Speech API is not supported in this browser. Try Chrome.');
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <div className="mic-wrap">
      <button
        className={'mic' + (isListening ? ' listening' : '')}
        onClick={toggleListen}
        disabled={!supported}
        aria-pressed={isListening}
      >
        <span className="ring" aria-hidden="true" />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
        </svg>
        <span className="mic-label">
          {isListening ? 'Listening… speak now' : (supported ? 'Start microphone' : 'Microphone unsupported')}
        </span>
      </button>
      <p className="mic-hint">
        {supported
          ? 'Speak naturally — your words become an ASL gloss and the avatar signs it.'
          : 'Your browser lacks the Web Speech API. Open this in Chrome or Edge over https / localhost.'}
      </p>
    </div>
  );
}