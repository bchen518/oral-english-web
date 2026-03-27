import { useState, useEffect, useCallback } from 'react';
import { LEVELS } from '../data/lessons.js';
import { useTTS } from '../hooks/useTTS.js';
import { useRecorder } from '../hooks/useRecorder.js';

// ── Phase configuration ───────────────────────────────────────────────────────
const PHASE_CONFIG = {
  idle:            { icon: '🔊', color: '#2563eb', title: 'Ready',          subtitle: 'Press Listen to hear the sentence.' },
  listening:       { icon: '👂', color: '#2563eb', title: 'Listen Carefully', subtitle: 'Pay attention to pronunciation and rhythm.' },
  waitingToRepeat: { icon: '🎙️', color: '#ea580c', title: 'Your Turn!',     subtitle: 'Press Record and repeat the sentence aloud.' },
  recording:       { icon: '🔴', color: '#dc2626', title: 'Recording…',      subtitle: 'Speak clearly, then press Stop when done.' },
  recorded:        { icon: '✅', color: '#16a34a', title: 'Nice Work!',       subtitle: 'Play back to compare, or move to the next sentence.' },
};

export default function PracticePage({ lesson, onBack }) {
  const [idx, setIdx]           = useState(0);
  const [phase, setPhase]       = useState('idle');
  const [speed, setSpeed]       = useState(0.5);   // 0–1, remapped in useTTS
  const [showDone, setShowDone] = useState(false);

  const tts      = useTTS();
  const recorder = useRecorder();

  const sentence = lesson.sentences[idx];
  const isLast   = idx === lesson.sentences.length - 1;
  const meta     = LEVELS[lesson.level];
  const pct      = Math.round(((idx + 1) / lesson.sentences.length) * 100);

  // ── Auto-listen when sentence changes ────────────────────────────────────
  const listenToSentence = useCallback(() => {
    recorder.reset();
    setPhase('listening');
    tts.speak(sentence, speed);
  }, [sentence, speed, tts, recorder]);

  useEffect(() => {
    tts.onFinishedRef.current = () => {
      setPhase((p) => (p === 'listening' ? 'waitingToRepeat' : p));
    };
  }, [tts.onFinishedRef]);

  // Auto-play on mount and when sentence changes
  useEffect(() => {
    const timer = setTimeout(listenToSentence, 300);
    return () => {
      clearTimeout(timer);
      tts.stop();
      recorder.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function goNext() {
    tts.stop();
    recorder.reset();
    if (isLast) {
      setShowDone(true);
    } else {
      setIdx((i) => i + 1);
      setPhase('idle');
    }
  }

  function goPrev() {
    if (idx === 0) return;
    tts.stop();
    recorder.reset();
    setIdx((i) => i - 1);
    setPhase('idle');
  }

  // ── Recording controls ────────────────────────────────────────────────────
  function handleRecord() {
    if (phase === 'recording') {
      recorder.stopRecording();
      setPhase('recorded');
    } else {
      tts.stop();
      setPhase('recording');
      recorder.startRecording();
    }
  }

  function handlePlayback() {
    recorder.isPlaying ? recorder.stopPlaying() : recorder.playRecording();
  }

  // ── Completion screen ─────────────────────────────────────────────────────
  if (showDone) {
    return <CompletionScreen lesson={lesson} onBack={onBack} onRestart={() => {
      setIdx(0);
      setPhase('idle');
      setShowDone(false);
    }} />;
  }

  const cfg = PHASE_CONFIG[phase];

  return (
    <div className="practice-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="practice-header">
        <button className="back-btn" onClick={() => { tts.stop(); recorder.reset(); onBack(); }}>
          ‹ Back
        </button>
        <div className="practice-header-center">
          <div className="practice-header-title">{lesson.title}</div>
          <div className="practice-header-topic">{lesson.topic}</div>
        </div>
        <span className="level-badge" style={{ color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
      </header>

      <div className="practice-body">
        {/* ── Progress bar ───────────────────────────────────────────────────── */}
        <div className="progress-section">
          <div className="progress-labels">
            <span>Sentence {idx + 1} of {lesson.sentences.length}</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* ── Sentence card ──────────────────────────────────────────────────── */}
        <div className={`sentence-card ${phase === 'listening' ? 'sentence-card--active' : ''}`}>
          <div className="sentence-card-speaker">
            <span>🗣️</span>
            <div>
              <div className="speaker-label">Native Speaker</div>
              <div className="speaker-voice">{tts.voiceName}</div>
            </div>
          </div>

          <hr className="card-divider" />

          {/* Highlighted sentence */}
          <HighlightedText text={sentence} range={tts.highlightedRange} />

          {/* Animated wave while listening */}
          {phase === 'listening' && <SoundWave />}
        </div>

        {/* ── Phase guide ────────────────────────────────────────────────────── */}
        <div className="phase-guide" style={{ '--phase-color': cfg.color }}>
          <div className="phase-icon">{cfg.icon}</div>
          <div>
            <div className="phase-title">{cfg.title}</div>
            <div className="phase-subtitle">{cfg.subtitle}</div>
          </div>
        </div>

        {/* ── Speed slider ───────────────────────────────────────────────────── */}
        <div className="speed-control">
          <span className="speed-icon">🐢</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            disabled={phase === 'listening'}
            className="speed-slider"
          />
          <span className="speed-icon">🐇</span>
          <span className="speed-label">{speedLabel(speed)}</span>
        </div>

        {/* ── Browser support warnings ────────────────────────────────────────── */}
        {!tts.supported && (
          <div className="warning-banner">
            ⚠️ Your browser doesn't support Text-to-Speech. Please use Chrome or Edge.
          </div>
        )}
        {recorder.permissionState === 'denied' && (
          <div className="warning-banner">
            🎤 Microphone access was denied. Please allow it in your browser settings and reload.
          </div>
        )}

        {/* ── Action buttons ─────────────────────────────────────────────────── */}
        <div className="action-buttons">
          {/* Listen */}
          <button
            className={`action-btn action-btn--blue ${phase === 'listening' ? 'action-btn--dimmed' : ''}`}
            onClick={listenToSentence}
            disabled={phase === 'listening' || phase === 'recording' || !tts.supported}
          >
            {phase === 'listening' ? '🔊 Playing…' : '🔊 Listen Again'}
          </button>

          {/* Record + Play Back */}
          <div className="action-row">
            <button
              className={`action-btn ${phase === 'recording' ? 'action-btn--red' : 'action-btn--orange'}`}
              onClick={handleRecord}
              disabled={phase === 'listening' || !recorder.supported}
              style={{ flex: 1 }}
            >
              {phase === 'recording' ? '⏹ Stop' : '🎙️ Record'}
            </button>
            <button
              className={`action-btn action-btn--gray ${recorder.hasRecording ? '' : 'action-btn--muted'}`}
              onClick={handlePlayback}
              disabled={!recorder.hasRecording || phase === 'recording'}
              style={{ flex: 1 }}
            >
              {recorder.isPlaying ? '⏹ Stop' : '▶ Play Back'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────────── */}
      <div className="bottom-bar">
        <button
          className="nav-btn nav-btn--ghost"
          onClick={goPrev}
          disabled={idx === 0}
        >
          ‹ Previous
        </button>
        <button className="nav-btn nav-btn--solid" onClick={goNext}>
          {isLast ? '✓ Finish' : 'Next ›'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HighlightedText({ text, range }) {
  if (!range) {
    return <p className="sentence-text">{text}</p>;
  }
  const { start, length } = range;
  const before = text.slice(0, start);
  const word   = text.slice(start, start + length);
  const after  = text.slice(start + length);
  return (
    <p className="sentence-text">
      {before}
      <mark className="word-highlight">{word}</mark>
      {after}
    </p>
  );
}

function SoundWave() {
  const heights = [5, 14, 20, 16, 8, 18, 12, 20, 6];
  return (
    <div className="sound-wave">
      {heights.map((h, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{ '--bar-h': `${h}px`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

function CompletionScreen({ lesson, onBack, onRestart }) {
  const meta = LEVELS[lesson.level];
  return (
    <div className="completion-screen">
      <div className="completion-trophy">🏆</div>
      <h2 className="completion-title">Lesson Complete!</h2>
      <p className="completion-lesson">{lesson.title}</p>
      <div className="completion-stats">
        <div className="stat-badge">
          <div className="stat-value">{lesson.sentences.length}</div>
          <div className="stat-label">Sentences</div>
        </div>
        <div className="stat-badge">
          <div className="stat-value" style={{ color: meta.color }}>{meta.label}</div>
          <div className="stat-label">Level</div>
        </div>
        <div className="stat-badge">
          <div className="stat-value" style={{ fontSize: 14 }}>{lesson.topic}</div>
          <div className="stat-label">Topic</div>
        </div>
      </div>
      <div className="completion-actions">
        <button className="btn-primary" onClick={onBack}>← Back to Home</button>
        <button className="btn-ghost" onClick={onRestart}>Practice Again</button>
      </div>
    </div>
  );
}

function speedLabel(v) {
  if (v < 0.3) return 'Slow';
  if (v < 0.6) return 'Normal';
  if (v < 0.8) return 'Fast';
  return 'Very Fast';
}
