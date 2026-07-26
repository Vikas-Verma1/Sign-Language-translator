// Target bone rotation targets for specific sign poses
export const POSE_DICTIONARY = {
  REST: { leftArm: [0, 0, 0], rightArm: [0, 0, 0] },
  HELLO: { leftArm: [0, 0, 0], rightArm: [0, 0, 1.2] },  // Right hand raised waving
  YOU: { leftArm: [0, 0, 0], rightArm: [0.8, 0, 0.2] },   // Pointing forward
  ME: { leftArm: [0, 0, 0], rightArm: [0.4, 0, -0.4] },   // Pointing to chest
  THANKS: { leftArm: [0, 0, 0], rightArm: [1.1, 0, 0.1] },// Fingers from chin out
};

export async function processSpeechToGloss(transcript) {
  try {
    const res = await fetch('http://localhost:5000/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: transcript })
    });
    const data = await res.json();
    return data.gloss;
  } catch (err) {
    // Fallback if backend is not running
    return transcript
      .toUpperCase()
      .replace(/[^\w\s]/gi, '')
      .split(' ');
  }
}