/**
 * Fetches lesson content dynamically from Wikipedia's REST API.
 * Wikipedia's API supports CORS for browser requests.
 */

const WIKI = 'https://en.wikipedia.org/api/rest_v1';

const TOPICS = {
  Science:    ['Albert_Einstein', 'DNA', 'Solar_System', 'Evolution', 'Quantum_mechanics', 'Black_hole', 'Photosynthesis'],
  History:    ['World_War_II', 'Ancient_Rome', 'Silk_Road', 'Renaissance', 'American_Revolution', 'Ancient_Egypt', 'Cold_War'],
  Technology: ['Internet', 'Artificial_intelligence', 'Space_exploration', 'Electricity', 'Computer', 'Smartphone', 'Robotics'],
  Society:    ['Democracy', 'United_Nations', 'Human_rights', 'Globalization', 'Education', 'Climate_change', 'Immigration'],
  Culture:    ['Music', 'Cinema', 'Literature', 'Olympic_Games', 'Cuisine', 'Fashion', 'Architecture'],
};

export const LIVE_TOPICS = Object.keys(TOPICS);

export const TOPIC_ICONS = {
  Science: '🔬', History: '📜', Technology: '💻', Society: '🌐', Culture: '🎭',
};

/** Strip parentheticals and citations, then split into clean sentences. */
function extractSentences(text) {
  const clean = text
    .replace(/\([^)]{0,120}\)/g, '')   // remove short (...) asides
    .replace(/\[[^\]]*\]/g, '')         // remove [...] citations
    .replace(/\s+/g, ' ')
    .trim();

  // Split on sentence-ending punctuation followed by whitespace + capital letter
  const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return parts
    .map(s => s.trim())
    .filter(s => s.length >= 40 && s.length <= 220 && /[a-z]/.test(s));
}

/** Estimate reading level from average words per sentence. */
function inferLevel(sentences) {
  const avg = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
  if (avg < 12) return 'beginner';
  if (avg < 20) return 'intermediate';
  return 'advanced';
}

/** Convert a Wikipedia summary response to a lesson object, or null if too short. */
function articleToLesson(data, topic) {
  const extract = data.extract || '';
  const sentences = extractSentences(extract);
  if (sentences.length < 3) return null;
  const kept = sentences.slice(0, 8);
  return {
    id:        `wiki-${data.pageid || Date.now()}`,
    title:     data.title || 'Wikipedia Article',
    level:     inferLevel(kept),
    topic:     topic || 'Live Content',
    sentences: kept,
    isLive:    true,
  };
}

/** Fetch a random Wikipedia article and convert to a lesson. Retries up to 5 times. */
export async function fetchRandomLesson(attempt = 0) {
  if (attempt > 5) throw new Error('Could not find a suitable article. Please try again.');
  const res = await fetch(`${WIKI}/page/random/summary`);
  if (!res.ok) throw new Error('Wikipedia request failed.');
  const data = await res.json();
  const lesson = articleToLesson(data, 'Random');
  return lesson ?? fetchRandomLesson(attempt + 1);
}

/** Fetch a Wikipedia article for a specific topic category. */
export async function fetchTopicLesson(topic) {
  const titles = TOPICS[topic];
  if (!titles) throw new Error(`Unknown topic: ${topic}`);
  const title = titles[Math.floor(Math.random() * titles.length)];
  const res = await fetch(`${WIKI}/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error('Wikipedia request failed.');
  const data = await res.json();
  const lesson = articleToLesson(data, topic);
  if (!lesson) throw new Error('Article has too little usable content. Please try again.');
  return lesson;
}
