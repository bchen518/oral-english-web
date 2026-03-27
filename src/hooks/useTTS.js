import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Wraps the Web Speech API (SpeechSynthesis) to mirror the iOS TTSService.
 *
 * Returns:
 *   isSpeaking        – true while TTS is playing
 *   didFinish         – flips true when utterance ends naturally
 *   highlightRange    – { start, length } of the word being spoken right now
 *   voiceName         – display name of the selected voice
 *   speak(text, rate) – start speaking; rate is 0–1 (remapped internally)
 *   stop()            – cancel current speech
 *   onFinishedRef     – assign a callback: onFinishedRef.current = () => { … }
 */
export function useTTS() {
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [didFinish, setDidFinish]         = useState(false);
  const [highlightRange, setHighlightRange] = useState(null);
  const [voiceName, setVoiceName]         = useState('Loading voices…');

  const voiceRef      = useRef(null);
  const onFinishedRef = useRef(null);   // consumer sets this
  const supported     = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // ── Voice loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supported) return;

    function load() {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      voiceRef.current = pickFemaleAmericanVoice(voices);
      setVoiceName(voiceRef.current?.name ?? 'Default');
    }

    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  // ── speak ──────────────────────────────────────────────────────────────────
  // rate is 0–1 (matching iOS slider range). We map it to the Web API range
  // of 0.5–1.4, which feels comfortable for language learning.
  const speak = useCallback(
    (text, rate = 0.5) => {
      if (!supported) return;
      window.speechSynthesis.cancel();

      const apiRate = 0.5 + rate * 0.9;  // maps [0,1] → [0.5, 1.4]
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice  = voiceRef.current;
      utterance.rate   = apiRate;
      utterance.pitch  = 1.05;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setDidFinish(false);
        setHighlightRange(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setDidFinish(true);
        setHighlightRange(null);
        onFinishedRef.current?.();
      };

      utterance.onerror = (e) => {
        // 'interrupted' fires when we cancel() – not a real error
        if (e.error !== 'interrupted') {
          setIsSpeaking(false);
        }
      };

      // Word-by-word boundary highlighting (Chrome / Edge support this well;
      // Firefox and Safari may not fire it – the app degrades gracefully).
      utterance.onboundary = (e) => {
        if (e.name !== 'word') return;
        const len = e.charLength ?? guessWordLength(text, e.charIndex);
        setHighlightRange({ start: e.charIndex, length: len });
      };

      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  // ── stop ───────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setHighlightRange(null);
  }, [supported]);

  return { isSpeaking, didFinish, highlightRange, voiceName, speak, stop, onFinishedRef, supported };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pickFemaleAmericanVoice(voices) {
  // Known female voice name fragments, in preference order
  const femaleKeywords = [
    'samantha', 'zira', 'aria', 'jenny', 'sonia',
    'emma', 'karen', 'moira', 'victoria', 'susan',
    'allison', 'ava', 'nova', 'shimmer',
  ];

  for (const kw of femaleKeywords) {
    const v = voices.find(
      (v) => v.lang.startsWith('en-US') && v.name.toLowerCase().includes(kw)
    );
    if (v) return v;
  }

  // Any en-US voice
  return voices.find((v) => v.lang.startsWith('en-US')) ?? voices[0];
}

/** Estimate word length when charLength is absent. */
function guessWordLength(text, start) {
  const rest = text.slice(start);
  const match = rest.match(/^[\w'']+/);
  return match ? match[0].length : 1;
}
