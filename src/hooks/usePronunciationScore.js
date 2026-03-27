import { useState, useRef, useCallback } from 'react';

/**
 * Scores student pronunciation by running Web Speech API SpeechRecognition
 * alongside the MediaRecorder and comparing the resulting transcript to the
 * expected sentence using Longest Common Subsequence word matching.
 *
 * Usage:
 *   const scoring = usePronunciationScore();
 *   scoring.startScoring(expectedSentence);  // call when recording starts
 *   scoring.stopScoring();                   // call when recording stops
 *   // scoring.score is set asynchronously via onend
 *
 * Returns:
 *   score        – 0–100, or null (not yet scored / not supported)
 *   transcript   – what the browser heard the student say
 *   isScoring    – recognition is actively listening
 *   supported    – false on Firefox (no SpeechRecognition support)
 *   startScoring(sentence) – begin recognition against sentence
 *   stopScoring()          – finalise and calculate score
 *   reset()                – clear score and transcript
 */
export function usePronunciationScore() {
  const [score,      setScore]      = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isScoring,  setIsScoring]  = useState(false);

  const recognitionRef  = useRef(null);
  const expectedRef     = useRef('');
  const transcriptAccum = useRef('');   // built up from isFinal results

  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null;
  const supported = !!SR;

  // ── startScoring ────────────────────────────────────────────────────────────
  const startScoring = useCallback((expectedSentence) => {
    if (!SR) return;

    recognitionRef.current?.abort();   // clean up any previous session

    expectedRef.current    = expectedSentence;
    transcriptAccum.current = '';
    setScore(null);
    setTranscript('');

    const r = new SR();
    r.lang            = 'en-US';
    r.continuous      = true;    // keep listening until we call .stop()
    r.interimResults  = true;    // accumulate results progressively
    r.maxAlternatives = 1;

    r.onresult = (event) => {
      // Concatenate all finalised segments received so far
      let finals = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finals += event.results[i][0].transcript + ' ';
        }
      }
      transcriptAccum.current = finals.trim();
    };

    // onend fires after .stop() — this is where we calculate the score
    r.onend = () => {
      setIsScoring(false);
      const t = transcriptAccum.current;
      setTranscript(t);
      setScore(scoreTranscript(expectedRef.current, t));
    };

    r.onerror = (e) => {
      // 'aborted' fires when we call .abort() — not a real error
      if (e.error !== 'aborted') {
        setIsScoring(false);
        setScore(scoreTranscript(expectedRef.current, transcriptAccum.current));
      }
    };

    recognitionRef.current = r;
    try {
      r.start();
      setIsScoring(true);
    } catch (e) {
      console.warn('[usePronunciationScore] start error:', e);
    }
  }, [SR]);

  // ── stopScoring ─────────────────────────────────────────────────────────────
  // Calling .stop() (not .abort()) triggers onend which finalises the score.
  const stopScoring = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // ── reset ────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    setScore(null);
    setTranscript('');
    setIsScoring(false);
    transcriptAccum.current = '';
  }, []);

  return { score, transcript, isScoring, supported, startScoring, stopScoring, reset };
}

// ── Scoring algorithm ─────────────────────────────────────────────────────────

/** Strip punctuation, lowercase, collapse whitespace. */
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score the student's transcript against the expected sentence.
 * Uses Longest Common Subsequence at the word level so word order matters
 * but small omissions/insertions don't tank the score entirely.
 * Returns an integer 0–100.
 */
function scoreTranscript(expected, actual) {
  if (!actual) return 0;
  const expWords = normalize(expected).split(' ').filter(Boolean);
  const actWords = normalize(actual).split(' ').filter(Boolean);
  if (!expWords.length) return 0;
  const matched = lcsLength(expWords, actWords);
  return Math.min(100, Math.round((matched / expWords.length) * 100));
}

function lcsLength(a, b) {
  const m = a.length, n = b.length;
  // Use two-row rolling array to keep memory O(n)
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[n];
}
