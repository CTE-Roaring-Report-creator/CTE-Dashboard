import { useState, useRef, useEffect } from "react";
import Phase1 from "./CTECurriculumDashboard";
import Phase2 from "./Phase2";
import Phase3 from "./Phase3.jsx";

const PHASES = [
  { id: 1, label: "📚 Master Builder",   sub: "Phase 1" },
  { id: 2, label: "📅 Weekly Dashboard", sub: "Phase 2" },
  { id: 3, label: "🗓 Monthly Calendar", sub: "Phase 3" },
];

function loadSettingsSync() {
  try {
    const val = localStorage.getItem("app-settings");
    if (val) return JSON.parse(val);
  } catch (_) {}
  return { selectedCourse: "intro-tech", mediaYear: "media-a" };
}

function saveSettingsSync(s) {
  try {
    localStorage.setItem("app-settings", JSON.stringify(s));
  } catch (_) {}
}

export default function App() {
  const [phase, setPhase] = useState(1);
  const focusedWeekRef = useRef(null);

  // Lifted course state — shared between Phase 2 and Phase 3
  const [selectedCourse, setSelectedCourse] = useState(() => loadSettingsSync().selectedCourse || "intro-tech");
  const [mediaYear, setMediaYear]           = useState(() => loadSettingsSync().mediaYear    || "media-a");

  // Keep app-settings in sync whenever course changes
  useEffect(() => {
    const existing = loadSettingsSync();
    saveSettingsSync({ ...existing, selectedCourse, mediaYear });
  }, [selectedCourse, mediaYear]);

  // Increments whenever Phase 3 saves a calendar change — triggers Phase 2 to re-read
  const [calendarVersion, setCalendarVersion] = useState(0);
  const handleCalendarSaved = () => setCalendarVersion(v => v + 1);

  // Called by Phase 2 or Phase 3 when the user picks a different course
  const handleCourseChange = (courseId, newMediaYear) => {
    setSelectedCourse(courseId);
    if (newMediaYear) setMediaYear(newMediaYear);
  };

  // Called by Phase 3 day-click — jump to that week in Phase 2
  const handleGoToWeek = (dateStr) => {
    focusedWeekRef.current = dateStr;
    setPhase(2);
  };

  // Called by Phase 3 right-click → Open in Master Builder
  const focusedLessonRef = useRef(null);
  const handleGoToLesson = (courseId, lessonId) => {
    focusedLessonRef.current = { courseId, lessonId };
    setPhase(1);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f1117", minHeight: "100vh" }}>

      {/* All phases stay mounted so storage stays in sync */}
      <div style={{ display: phase === 1 ? "block" : "none" }}>
        <Phase1
          isActive={phase === 1}
          focusedLesson={focusedLessonRef.current}
          onLessonFocused={() => { focusedLessonRef.current = null; }}
        />
      </div>
      <div style={{ display: phase === 2 ? "block" : "none" }}>
        <Phase2
          isActive={phase === 2}
          calendarVersion={calendarVersion}
          selectedCourse={selectedCourse}
          mediaYear={mediaYear}
          onCourseChange={handleCourseChange}
          focusedWeek={focusedWeekRef.current}
          onWeekFocused={() => { focusedWeekRef.current = null; }}
        />
      </div>
      <div style={{ display: phase === 3 ? "block" : "none" }}>
        <Phase3
          isActive={phase === 3}
          selectedCourse={selectedCourse}
          mediaYear={mediaYear}
          onCourseChange={handleCourseChange}
          onCalendarSaved={handleCalendarSaved}
          onGoToWeek={handleGoToWeek}
          onGoToLesson={handleGoToLesson}
        />
      </div>

      {/* Floating phase switcher */}
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 6, padding: "6px 8px",
        background: "#161b27", border: "1.5px solid #2a3050",
        borderRadius: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        zIndex: 9998,
      }}>
        {PHASES.map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)} style={{
            padding: "8px 20px", borderRadius: 32, fontSize: 13,
            fontWeight: phase === p.id ? 700 : 400,
            border: "none", cursor: "pointer", fontFamily: "inherit",
            background: phase === p.id ? "#1a56c4" : "transparent",
            color: phase === p.id ? "white" : "#5a6380",
            transition: "all 0.15s",
          }}>
            {p.label}
          </button>
        ))}
      </div>

    </div>
  );
}
