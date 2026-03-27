import { useState, useEffect, useCallback } from 'react';
import { LEVELS } from '../data/lessons.js';
import { useTTS } from '../hooks/useTTS.js';
import { useRecorder } from '../hooks/useRecorder.js';
import { usePronunciationScore } from '../hooks/usePronunciationScore.js';

// ── Phase configuration ───────────────────────────────────────────────────────
const PHASE_CONFIG = {
  idle:            { icon: '🔊', color: '#2563eb', title: 'Ready',           subtitle: 'Press Listen to hear the sentence.' },
  listening:       { icon: '👂', color: '#2563eb', title: 'Listen Carefully', subtitle: 'Pay attention to pronunciation and rhythm.' },
  waitingToRepeat: { icon: '🎙️', color: '#ea580c', title: 'Your Turn!',      subtitle: 'Press Record and repeat the sentence aloud.' },
  recording:       { icon: '🔴', color: '#dc2626', title: 'Recording…',       subtitle: 'Speak clearly, then press Stop when done.' },
  recorded:        { icon: '✅', color: '#16a34a', title: 'Nice Work!',        subtitle: 'See your score below, then continue.' },
};

const PASS_THRESHOLD = 70;

export default function PracticePage({ lesson, onBack }) {
  const [idx, setIdx]           = useState(0);
  const [phase, setPhase]       = useState('idle');
  const [speed, setSpeed]       = useState(0.5);
  const [showDone, setShowDone] = useState(false);

  const tts      = useTTS();
  const recorder = useRecorder();
  const scoring  = usePronunciationScore();

  const sentence = lesson.sentences[idx];
  const isLast   = idx === lesson.sentences.length - 1;
  const meta     = LEVELS[lesson.level];
  const pct      = Math.round(((idx + 1) / lesson.sentences.length) * 100);

  // Whether the current score blocks forward navigation
  const scoreFailing = scoring.supported
    && phase === 'recorded'
    && scoring.score !== null
    && scoring.score < PASS_THRESHOLD;

  // ── Listen ────────────────────────────────────────────────────────────────
  const listenToSentence = useCallback(() => {
    recorder.reset();
    scoring.reset();
    setPhase('listening');
    tts.speak(sentence, speed);
  }, [sentence, speed, tts, recorder, scoring]);

  useEffect(() => {
    tts.onFinishedRef.current = () => {
      setPhase((p) => (p === 'listening' ? 'waitingToRepeat' : p));
    };
  }, [tts.onFinishedRef]);

  // Auto-play when sentence index changes
  useEffect(() => {
    const timer = setTimeout(listenToSentence, 300);
    return () => {
      clearTimeout(timer);
      tts.stop();
      recorder.reset();
      scoring.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function goNext() {
    tts.stop();
    recorder.reset();
    scoring.reset();
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
    scoring.reset();
    setIdx((i) => i - 1);
    setPhase('idle');
  }

  // Return to waitingToRepeat so the student can record again immediately
  function tryAgain() {
    recorder.reset();
    scoring.reset();
    setPhase('waitingToRepeat');
  }

  // ── Recording controls ────────────────────────────────────────────────────
  function handleRecord() {
    if (phase === 'recording') {
      recorder.stopRecording();
      scoring.stopScoring();
      setPhase('recorded');
    } else {
      tts.stop();
      setPhase('recording');
      recorder.startRecording();
      scoring.startScoring(sentence);
    }
  }

  function handlePlayback() {
    recorder.isPlaying ? recorder.stopPlaying() : recorder.playRecording();
  }

  // ── Completion screen ─────────────────────────────────────────────────────
  if (showDone) {
    return (
      <CompletionScreen
        lesson={lesson}
        onBack={onBack}
        onRestart={() => { setIdx(0); setPhase('idle'); setShowDone(false); }}
      />
    );
  }

  const cfg = PHASE_CONFIG[phase];

  return (
    <div className="practice-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="practice-header">
        <button className="back-btn" onClick={() => { tts.stop(); recorder.reset(); scoring.reset(); onBack(); }}>
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
          <HighlightedText text={sentence} range={tts.highlightedRange} />
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

        {/* ── Score card (shown after recording) ─────────────────────────────── */}
        {phase === 'recorded' && (
          <ScoreCard
            score={scoring.score}
            transcript={scoring.transcript}
            isScoring={scoring.isScoring}
            supported={scoring.supported}
          />
        )}

        {/* ── Speed slider ───────────────────────────────────────────────────── */}
        <div className="speed-control">
          <span className="speed-icon">🐢</span>
          <input
            type="range" min="0" max="1" step="0.1"
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

      {/* ── Bottom navigation bar ───────────────────────────────────────────── */}
      <div className="bottom-bar">
        <button
          className="nav-btn nav-btn--ghost"
          onClick={goPrev}
          disabled={idx === 0}
        >
          ‹ Previous
        </button>

        {scoreFailing ? (
          /* Score below threshold — nudge student to try again */
          <div className="bottom-bar-retry">
            <button className="nav-btn nav-btn--ghost-sm" onClick={goNext}>
              {isLast ? 'Finish anyway' : 'Skip anyway'}
            </button>
            <button className="nav-btn nav-btn--orange" onClick={tryAgain}>
              🔄 Try Again
            </button>
          </div>
        ) : (
          <button className="nav-btn nav-btn--solid" onClick={goNext}>
            {isLast ? '✓ Finish' : 'Next ›'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCard({ score, transcript, isScoring, supported }) {
  if (!supported) return null;

  if (isScoring) {
    return (
      <div className="score-card score-card--loading">
        <span className="score-spinner" />
        <span className="score-analyzing">Analyzing pronunciation…</span>
      </div>
    );
  }

  if (score === null) return null;

  const { color, bg, emoji, label } = scoreMeta(score);

  return (
    <div className="score-card" style={{ '--sc': color, '--sc-bg': bg }}>
      <div className="score-card-header">🎯 Pronunciation Score</div>

      <div className="score-display">
        <span className="score-number">{score}</span>
        <span className="score-denom">/100</span>
      </div>

      {/* Score bar */}
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
        {/* Threshold line at 70 */}
        <div className="score-threshold-line" style={{ left: `${PASS_THRESHOLD}%` }} />
      </div>
      <div className="score-threshold-label">
        <span style={{ marginLeft: `${PASS_THRESHOLD}%` }}>Pass ({PASS_THRESHOLD})</span>
      </div>

      <div className="score-verdict">{emoji} {label}</div>

      {transcript && (
        <div className="score-transcript">
          You said: <em>"{transcript}"</em>
        </div>
      )}
    </div>
  );
}

function scoreMeta(score) {
  if (score >= 90) return { color: '#16a34a', bg: '#dcfce7', emoji: '🌟', label: 'Excellent! Perfect pronunciation.' };
  if (score >= 70) return { color: '#16a34a', bg: '#dcfce7', emoji: '👍', label: 'Good job! You can move on.' };
  if (score >= 50) return { color: '#ea580c', bg: '#fff7ed', emoji: '💪', label: 'Almost there — try again to improve.' };
  return             { color: '#dc2626', bg: '#fef2f2', emoji: '🔄', label: 'Keep practicing — you\'ve got this!' };
}

function HighlightedText({ text, range }) {
  if (!range) return <p className="sentence-text">{text}</p>;
  const { start, length } = range;
  return (
    <p className="sentence-text">
      {text.slice(0, start)}
      <mark className="word-highlight">{text.slice(start, start + length)}</mark>
      {text.slice(start + length)}
    </p>
  );
}

function SoundWave() {
  const heights = [5, 14, 20, 16, 8, 18, 12, 20, 6];
  return (
    <div className="sound-wave">
      {heights.map((h, i) => (
        <span key={i} className="wave-bar"
          style={{ '--bar-h': `${h}px`, animationDelay: `${i * 80}ms` }} />
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
