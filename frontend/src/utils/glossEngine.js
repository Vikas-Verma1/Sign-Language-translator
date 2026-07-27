// Target bone rotation targets for specific sign poses
export const POSE_DICTIONARY = {
  REST: { leftArm: [0, 0, 0], rightArm: [0, 0, 0] },
  HELLO: { leftArm: [0, 0, 0], rightArm: [0, 0, 1.2] },  // Right hand raised waving
  YOU: { leftArm: [0, 0, 0], rightArm: [0.8, 0, 0.2] },   // Pointing forward
  ME: { leftArm: [0, 0, 0], rightArm: [0.4, 0, -0.4] },   // Pointing to chest
  THANKS: { leftArm: [0, 0, 0], rightArm: [1.1, 0, 0.1] },// Fingers from chin out
};

// Filters out spoken English stop words that don't exist in sign language
export function filterEnglishStopWords(text) {
  const stopWords = new Set(['is', 'am', 'are', 'was', 'were', 'the', 'a', 'an']);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(' ')
    .filter(word => word.trim().length > 0 && !stopWords.has(word)) // Filter out stop words
    .map(word => word.toUpperCase());
}

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
    // Fallback logic when backend is offline: clean up the text using stop words filter
    return filterEnglishStopWords(transcript);
  }
}