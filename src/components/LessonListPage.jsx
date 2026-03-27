import { useState } from 'react';
import { lessons, LEVELS } from '../data/lessons.js';
import { LessonCard } from './HomePage.jsx';

export default function LessonListPage({ initialLevel, onBack, onSelectLesson }) {
  const [activeLevel, setActiveLevel] = useState(initialLevel ?? null);

  const filtered = activeLevel
    ? lessons.filter((l) => l.level === activeLevel)
    : lessons;

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          ‹ Back
        </button>
        <h1 className="page-header-title">All Lessons</h1>
        <div style={{ width: 72 }} />
      </header>

      {/* Level filter chips */}
      <div className="filter-bar">
        <button
          className={`filter-chip ${!activeLevel ? 'active' : ''}`}
          onClick={() => setActiveLevel(null)}
        >
          All
        </button>
        {Object.entries(LEVELS).map(([key, meta]) => (
          <button
            key={key}
            className={`filter-chip ${activeLevel === key ? 'active' : ''}`}
            style={
              activeLevel === key
                ? { '--chip-color': meta.color, '--chip-bg': meta.bg }
                : {}
            }
            onClick={() => setActiveLevel(activeLevel === key ? null : key)}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Lesson list */}
      <div className="home-content" style={{ paddingTop: 12 }}>
        {filtered.length === 0 ? (
          <p className="empty-state">No lessons for this level yet.</p>
        ) : (
          <div className="lesson-list">
            {filtered.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onClick={() => onSelectLesson(lesson)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
