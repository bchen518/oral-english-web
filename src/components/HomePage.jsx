import { useState } from 'react';
import { lessons, LEVELS } from '../data/lessons.js';
import { fetchRandomLesson, fetchTopicLesson, LIVE_TOPICS, TOPIC_ICONS } from '../services/contentFetcher.js';

const HOW_IT_WORKS = [
  { icon: '🔊', title: 'Listen',  desc: 'Hear a native American female speaker read each sentence at your chosen speed.' },
  { icon: '🎙️', title: 'Repeat',  desc: 'Record yourself repeating the sentence out loud.' },
  { icon: '▶️', title: 'Compare', desc: 'Play back your recording and compare it with the model.' },
  { icon: '📈', title: 'Improve', desc: 'Practice until confident, then move to the next sentence.' },
];

export default function HomePage({ onSelectLesson, onBrowse }) {
  const featured = lessons.slice(0, 3);
  const countByLevel = (lvl) => lessons.filter((l) => l.level === lvl).length;

  const [liveLoading, setLiveLoading] = useState(null); // null | 'random' | topic name
  const [liveError,   setLiveError]   = useState('');

  async function handleLiveFetch(type) {
    setLiveLoading(type);
    setLiveError('');
    try {
      const lesson = type === 'random'
        ? await fetchRandomLesson()
        : await fetchTopicLesson(type);
      onSelectLesson(lesson);
    } catch (e) {
      setLiveError(e.message || 'Could not load content. Please try again.');
    } finally {
      setLiveLoading(null);
    }
  }

  return (
    <div className="home-page">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-icon">🗣️</div>
        <h1 className="hero-title">Oral English</h1>
        <p className="hero-sub">Listen · Repeat · Master</p>
        <button className="btn-primary hero-cta" onClick={() => onBrowse(null)}>
          Start Learning
        </button>
      </div>

      <div className="home-content">
        {/* ── Featured lessons ─────────────────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Featured Lessons</h2>
            <button className="link-btn" onClick={() => onBrowse(null)}>
              View all {lessons.length} →
            </button>
          </div>
          <div className="lesson-list">
            {featured.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} onClick={() => onSelectLesson(lesson)} />
            ))}
          </div>
        </section>

        {/* ── Live Content ─────────────────────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Live Content</h2>
            <span className="section-sub">Fresh from Wikipedia</span>
          </div>
          <div className="live-content-grid">
            {/* Random article button spans full width */}
            <button
              className="live-btn live-btn--random"
              onClick={() => handleLiveFetch('random')}
              disabled={!!liveLoading}
            >
              {liveLoading === 'random'
                ? <><i className="live-spinner" /><span>Loading…</span></>
                : <><span className="live-btn-icon">🎲</span><span>Random Article</span></>
              }
            </button>
            {LIVE_TOPICS.map((topic) => (
              <button
                key={topic}
                className="live-btn"
                onClick={() => handleLiveFetch(topic)}
                disabled={!!liveLoading}
              >
                <span className="live-btn-icon">
                  {liveLoading === topic ? <i className="live-spinner" style={{ width: 18, height: 18 }} /> : TOPIC_ICONS[topic]}
                </span>
                <span>{topic}</span>
              </button>
            ))}
          </div>
          {liveError && <p className="live-error">{liveError}</p>}
        </section>

        {/* ── Browse by Level ────────────────────────────────────── */}
        <section>
          <h2 className="section-title">Browse by Level</h2>
          <div className="level-grid">
            {Object.entries(LEVELS).map(([key, meta]) => (
              <button
                key={key}
                className="level-card"
                style={{ '--lvl-color': meta.color, '--lvl-bg': meta.bg }}
                onClick={() => onBrowse(key)}
              >
                <span className="level-card-label">{meta.label}</span>
                <span className="level-card-count">{countByLevel(key)} lessons</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────── */}
        <section>
          <h2 className="section-title">How It Works</h2>
          <div className="steps-card">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="step-row">
                <div className="step-number">{i + 1}</div>
                <div className="step-body">
                  <div className="step-title">
                    {step.icon} {step.title}
                  </div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Reusable LessonCard ──────────────────────────────────────────────────────
export function LessonCard({ lesson, onClick }) {
  const meta = LEVELS[lesson.level] ?? { color: '#6b7280', bg: '#f3f4f6', label: lesson.level };
  return (
    <button className="lesson-card" onClick={onClick}>
      <div
        className="lesson-card-icon"
        style={{ color: meta.color, background: meta.bg }}
      >
        {lesson.level === 'beginner' ? '①' : lesson.level === 'intermediate' ? '②' : '③'}
      </div>
      <div className="lesson-card-body">
        <div className="lesson-card-title">{lesson.title}</div>
        <div className="lesson-card-meta">
          <span className="level-badge" style={{ color: meta.color, background: meta.bg }}>
            {meta.label}
          </span>
          <span className="lesson-card-count">💬 {lesson.sentences.length} sentences</span>
          <span className="lesson-card-topic">{lesson.topic}</span>
        </div>
      </div>
      <span className="lesson-card-arrow">›</span>
    </button>
  );
}
