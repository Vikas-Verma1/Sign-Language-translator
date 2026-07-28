import React, { useState, useEffect } from 'react';

export default function SpeechInput({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

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
    <button className={isListening ? 'listening' : ''} onClick={toggleListen}>
      {isListening ? 'Listening... (Speak Now)' : 'Start Microphone'}
    </button>
  );
}