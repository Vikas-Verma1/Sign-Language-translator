import React, { useState } from 'react';
import SpeechInput from './components/SpeechInput';
import AvatarCanvas from './components/AvatarCanvas';
import { processSpeechToGloss } from './utils/glossEngine';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [glossQueue, setGlossQueue] = useState([]);
  const [activeGloss, setActiveGloss] = useState('');

  const handleTranscript = async (text) => {
    setTranscript(text);
    const glosses = await processSpeechToGloss(text);
    setGlossQueue(glosses);

    // Sequentially play gloss poses with timing delays
    glosses.forEach((token, index) => {
      setTimeout(() => {
        setActiveGloss(token);
      }, index * 1200); // Hold each gesture for 1.2 seconds
    });

    // Reset pose back to REST after queue finishes
    setTimeout(() => {
      setActiveGloss('REST');
    }, glosses.length * 1200);
  };

  return (
    <div className="container">
      <h1 className="header">Real-time Audio-to-Sign Language Translator</h1>
      <div className="main-content">
        <div className="controls-panel">
          <SpeechInput onTranscript={handleTranscript} />
          
          <h3>Spoken Speech:</h3>
          <div className="transcript-box">{transcript || 'Click start and speak...'}</div>

          <h3>Generated ASL Gloss:</h3>
          <div className="gloss-box">
            {glossQueue.length > 0 ? glossQueue.join(' ➔ ') : 'Awaiting speech input...'}
          </div>

          <h3>Active Signing Gesture:</h3>
          <div style={{ color: '#007bff', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {activeGloss || 'REST'}
          </div>
        </div>

        <div className="avatar-panel">
          <AvatarCanvas currentGloss={activeGloss} />
        </div>
      </div>
    </div>
  );
}