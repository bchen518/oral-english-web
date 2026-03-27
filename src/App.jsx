import { useState } from 'react';
import HomePage        from './components/HomePage.jsx';
import LessonListPage  from './components/LessonListPage.jsx';
import PracticePage    from './components/PracticePage.jsx';

/**
 * Minimal state-based router – no external library needed.
 *
 * Screens:
 *   home     → landing page
 *   list     → filterable lesson browser
 *   practice → listen / record / compare
 */
export default function App() {
  const [screen,       setScreen]       = useState('home');   // 'home' | 'list' | 'practice'
  const [activeLesson, setActiveLesson] = useState(null);
  const [listLevel,    setListLevel]    = useState(null);  // pre-filter for list
  const [prevScreen,   setPrevScreen]   = useState('home'); // where to go on Back

  function goHome()   { setScreen('home'); }

  function openList(level) {
    setListLevel(level);
    setScreen('list');
  }

  function openLesson(lesson) {
    setPrevScreen(screen);  // remember origin so Back goes to the right place
    setActiveLesson(lesson);
    setScreen('practice');
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomePage onSelectLesson={openLesson} onBrowse={openList} />
      )}

      {screen === 'list' && (
        <LessonListPage
          initialLevel={listLevel}
          onBack={goHome}
          onSelectLesson={openLesson}
        />
      )}

      {screen === 'practice' && activeLesson && (
        <PracticePage lesson={activeLesson} onBack={() => setScreen(prevScreen)} />
      )}
    </div>
  );
}
