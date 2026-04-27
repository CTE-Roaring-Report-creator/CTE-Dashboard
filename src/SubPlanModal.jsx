import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp, Settings, Lock } from "lucide-react";

// ─── DESIGN CONSTANTS ────────────────────────────────────────────────────────

const D = {
  bg0: "#0f1117", bg1: "#161b27", bg2: "#1e2436", bg3: "#252b40",
  border0: "#1e2436", border1: "#2a3050", border2: "#3a4468",
  text0: "#f0ede8", text1: "#9ca3b8", text2: "#5a6380",
};

const LESSON_TYPE_META = {
  instruction:     { label: "Instruction",   accent: "#4d8ef0", bg: "#0d1f3d", border: "#1a3a6b" },
  classwork:       { label: "Classwork",     accent: "#f59e0b", bg: "#2d2000", border: "#6b4a00" },
  "group-project": { label: "Group Project", accent: "#22c55e", bg: "#0d2d1a", border: "#1a5433" },
  project:         { label: "Project",       accent: "#a855f7", bg: "#1a0d3d", border: "#381a6b" },
  assessment:      { label: "Assessment",    accent: "#f97316", bg: "#2d1a0d", border: "#6b3a1a" },
  lab:             { label: "Lab",           accent: "#22c55e", bg: "#0d2d1a", border: "#1a5433" },
};

const btnStyle = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: `1.5px solid ${D.border1}`, cursor: "pointer",
  background: D.bg2, color: D.text1, fontFamily: "inherit", whiteSpace: "nowrap",
};

const iconBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: D.text1, display: "flex", padding: 6, borderRadius: 7,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: `1.5px solid ${D.border1}`, borderRadius: 8,
  fontSize: 14, background: D.bg3, color: D.text0,
  outline: "none", fontFamily: "inherit",
};

// ─── COURSE DEFINITIONS ───────────────────────────────────────────────────────

export const SUB_PLAN_COURSES = [
  { id: "intro-tech",         name: "Intro to Technology",  grades: "6/7",     color: "#1a56c4" },
  { id: "digital-innovation", name: "Digital Innovation",   grades: "7/8",     color: "#0d9488" },
  { id: "media",              name: "Digital Media",        grades: "7/8-8/9", color: "#7c22d4", isMedia: true },
];

// ─── PERSISTENT STORAGE ───────────────────────────────────────────────────────
// Three localStorage keys — shared with generateSubPlan.js:
//   sub-note-template      → intro paragraph, printed as callout at top of every plan
//   sub-emergency-info     → emergency / location info, printed at bottom of every plan
//   sub-standing-bullets   → JSON: { [courseBaseId]: string[] } — auto-prepended per class

export const STORAGE_KEYS = {
  NOTE:      "sub-note-template",
  EMERGENCY: "sub-emergency-info",
  STANDING:  "sub-standing-bullets",
};

function loadPersistent(key, fallback = "") {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : fallback;
  } catch (_) { return fallback; }
}

function savePersistent(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

export function loadStandingBullets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STANDING);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

function saveStandingBullets(bullets) {
  try { localStorage.setItem(STORAGE_KEYS.STANDING, JSON.stringify(bullets)); } catch (_) {}
}

// ─── DATE HELPER ─────────────────────────────────────────────────────────────

function formatFullDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ─── MODAL SHELL ─────────────────────────────────────────────────────────────

function Modal({ children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "24px 16px 40px",
      backgroundColor: "rgba(5,7,15,0.88)",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: D.bg1, borderRadius: 16,
        border: `1.5px solid ${D.border1}`,
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        width: "100%", maxWidth: 820,
        display: "flex", flexDirection: "column",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── AUTO-GROW TEXTAREA ───────────────────────────────────────────────────────

function AutoTextarea({ value, onChange, placeholder, minRows = 3 }) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minRows * 22) + "px";
  }, [minRows]);

  useEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => { onChange(e.target.value); resize(); }}
      placeholder={placeholder}
      rows={minRows}
      style={{
        ...inputStyle,
        resize: "none",
        lineHeight: 1.65,
        fontSize: 13,
        overflow: "hidden",
        minHeight: minRows * 22,
      }}
    />
  );
}

// ─── BULLET LIST EDITOR ───────────────────────────────────────────────────────

function BulletEditor({ courseId, instructions, onChange, color, dataAttr = "sub-course" }) {
  const updateLine = (i, val) =>
    onChange(instructions.map((s, idx) => idx === i ? val : s));

  const addLine = (afterIndex) => {
    onChange([
      ...instructions.slice(0, afterIndex + 1),
      "",
      ...instructions.slice(afterIndex + 1),
    ]);
    setTimeout(() => {
      const els = document.querySelectorAll(`[data-${dataAttr}="${courseId}"]`);
      if (els[afterIndex + 1]) els[afterIndex + 1].focus();
    }, 0);
  };

  const removeLine = (i) => {
    if (instructions.length === 1) { onChange([""]); return; }
    onChange(instructions.filter((_, idx) => idx !== i));
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Enter") { e.preventDefault(); addLine(i); }
    if (e.key === "Backspace" && instructions[i] === "" && instructions.length > 1) {
      e.preventDefault();
      removeLine(i);
      setTimeout(() => {
        const els = document.querySelectorAll(`[data-${dataAttr}="${courseId}"]`);
        if (els[Math.max(0, i - 1)]) els[Math.max(0, i - 1)].focus();
      }, 0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {instructions.map((line, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: color, flexShrink: 0,
          }} />
          <input
            data-sub-course={courseId}
            type="text"
            value={line}
            onChange={e => updateLine(i, e.target.value)}
            onKeyDown={e => handleKeyDown(e, i)}
            placeholder={i === 0 ? "Add a standing instruction..." : "Add another instruction..."}
            style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: 13 }}
          />
          {instructions.length > 1 && (
            <button
              onClick={() => removeLine(i)}
              style={{ ...iconBtn, padding: 4, color: D.text2, borderRadius: 5 }}
              title="Remove bullet"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => addLine(instructions.length - 1)}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, color, background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit",
          padding: "3px 0", marginTop: 2,
        }}
      >
        <Plus size={13} /> Add bullet
      </button>
    </div>
  );
}

// ─── PERSISTENT SETTINGS PANEL ────────────────────────────────────────────────
// Collapsible panel. All fields auto-save to localStorage immediately on change.

function PersistentSettingsPanel({ isOpen, onToggle }) {
  const [note,      setNote]      = useState(() => loadPersistent(STORAGE_KEYS.NOTE));
  const [emergency, setEmergency] = useState(() => loadPersistent(STORAGE_KEYS.EMERGENCY));
  const [standing,  setStanding]  = useState(() => {
    const saved = loadStandingBullets();
    const init = {};
    for (const c of SUB_PLAN_COURSES) {
      init[c.id] = saved[c.id]?.length ? [...saved[c.id]] : [""];
    }
    return init;
  });

  // Auto-persist on every change
  useEffect(() => { savePersistent(STORAGE_KEYS.NOTE,      note);      }, [note]);
  useEffect(() => { savePersistent(STORAGE_KEYS.EMERGENCY, emergency); }, [emergency]);
  useEffect(() => {
    const toSave = {};
    for (const c of SUB_PLAN_COURSES) {
      const cleaned = (standing[c.id] || []).filter(s => s.trim());
      if (cleaned.length) toSave[c.id] = cleaned;
    }
    saveStandingBullets(toSave);
  }, [standing]);

  const updateStanding = (id, next) =>
    setStanding(prev => ({ ...prev, [id]: next }));

  return (
    <div style={{
      borderRadius: 10,
      border: isOpen ? `1.5px solid ${D.border2}` : `1.5px solid ${D.border1}`,
      overflow: "hidden",
    }}>
      {/* Header toggle */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 16px",
          background: isOpen ? D.bg3 : D.bg2,
          border: "none", cursor: "pointer", fontFamily: "inherit",
          borderBottom: isOpen ? `1px solid ${D.border2}` : "none",
        }}
      >
        <Settings size={14} color={D.text2} />
        <div style={{ flex: 1, textAlign: "left" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: D.text0 }}>
            Persistent Sub Plan Settings
          </span>
          <span style={{ fontSize: 11, color: D.text2, marginLeft: 8 }}>
            — saved and printed on every sub plan
          </span>
        </div>
        <div style={{ color: D.text2 }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div style={{
          padding: "18px 16px 20px",
          background: D.bg1,
          display: "flex", flexDirection: "column", gap: 22,
        }}>

          {/* ── Intro note */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text1, display: "block", marginBottom: 4 }}>
              Intro note for sub
              <span style={{ fontWeight: 400, color: D.text2, marginLeft: 6 }}>
                — printed as a highlighted callout at the top of every plan
              </span>
            </label>
            <AutoTextarea
              value={note}
              onChange={setNote}
              placeholder={
                "e.g. Thank you for covering! Students should sit in assigned seats " +
                "(seating chart in sub folder). Bell work is posted in Google Classroom " +
                "— please circulate to keep students on task. NO GAMES at any time. " +
                "Have students log out 2 minutes before the bell."
              }
              minRows={3}
            />
          </div>

          {/* ── Emergency & location info */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text1, display: "block", marginBottom: 4 }}>
              Emergency &amp; location info
              <span style={{ fontWeight: 400, color: D.text2, marginLeft: 6 }}>
                — printed at the bottom of every plan
              </span>
            </label>
            <AutoTextarea
              value={emergency}
              onChange={setEmergency}
              placeholder={
                "Emergency bag: red backpack by front door\n" +
                "Evacuation route: rear exit → field → flagpole\n" +
                "Office ext: 100  ·  Buddy teacher: Ms. Reyes, E-2\n" +
                "Hall passes: clipboard by door — one student at a time, max 5 min"
              }
              minRows={4}
            />
          </div>

          {/* ── Per-class standing bullets */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: D.text1, marginBottom: 4 }}>
              Standing instructions per class
              <span style={{ fontWeight: 400, color: D.text2, marginLeft: 6 }}>
                — auto-prepended before per-day additions on every plan
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
              {SUB_PLAN_COURSES.map(c => (
                <div key={c.id}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: c.color,
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                    {c.name}
                  </div>
                  <BulletEditor
                    courseId={c.id}
                    instructions={standing[c.id] || [""]}
                    onChange={next => updateStanding(c.id, next)}
                    color={c.color}
                    dataAttr="standing-course"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── ACCORDION COURSE SECTION ─────────────────────────────────────────────────

function CourseSection({
  c, courseId, mediaYear, periodLabel, lessonRef,
  instructions, onInstructionsChange, isOpen, onToggle,
  standingBullets,
}) {
  const typeMeta       = lessonRef
    ? (LESSON_TYPE_META[lessonRef.lesson.type] || LESSON_TYPE_META.instruction)
    : null;
  const filledStanding = (standingBullets || []).filter(s => s.trim());
  const bulletCount    = instructions.filter(s => s.trim()).length;
  const totalCount     = filledStanding.length + bulletCount;

  return (
    <div style={{
      borderRadius: 10,
      border: isOpen ? `1.5px solid ${c.color}60` : `1.5px solid ${D.border1}`,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      {/* Clickable header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 16px",
          background: isOpen ? c.color + "14" : D.bg2,
          border: "none", cursor: "pointer", fontFamily: "inherit",
          borderBottom: isOpen ? `1px solid ${c.color}30` : "none",
          transition: "background 0.15s",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />

        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: D.text0 }}>{c.name}</span>
            {c.isMedia && (
              <span style={{ fontSize: 11, fontWeight: 500, color: c.color }}>
                {mediaYear === "media-b" ? "Yr B" : "Yr A"}
              </span>
            )}
            <span style={{ fontSize: 11, color: D.text2 }}>{c.grades}</span>
            {periodLabel && (
              <span style={{ fontSize: 11, color: D.text2 }}>· {periodLabel}</span>
            )}
          </div>
          <div style={{
            fontSize: 11, marginTop: 2,
            color: isOpen ? (typeMeta?.accent || D.text2) : D.text2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {lessonRef
              ? `${typeMeta?.label} · ${lessonRef.lesson.title}`
              : "No lesson mapped for this date"
            }
          </div>
        </div>

        {/* Badge: total bullet count with breakdown */}
        {totalCount > 0 && !isOpen && (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
            background: c.color + "22", color: c.color, border: `1px solid ${c.color}40`,
            flexShrink: 0,
          }}>
            {totalCount} note{totalCount !== 1 ? "s" : ""}
            {filledStanding.length > 0 && (
              <span style={{ opacity: 0.7, fontWeight: 400 }}>
                {" "}({filledStanding.length} auto)
              </span>
            )}
          </div>
        )}

        <div style={{ color: isOpen ? c.color : D.text2, flexShrink: 0, transition: "color 0.15s" }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expandable body */}
      {isOpen && (
        <div style={{
          padding: "16px 16px 20px",
          background: D.bg1,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {/* Lesson reference — read only */}
          {lessonRef ? (
            <div style={{
              padding: "10px 12px", borderRadius: 8,
              background: D.bg2, border: `1px solid ${typeMeta?.border || D.border1}`,
              display: "flex", flexDirection: "column", gap: 5,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: typeMeta?.accent,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {typeMeta?.label} · Today's lesson
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text0 }}>
                {lessonRef.lesson.title}
              </div>
              {lessonRef.lesson.objective && (
                <div style={{ fontSize: 12, color: D.text1, lineHeight: 1.55 }}>
                  {lessonRef.lesson.objective}
                </div>
              )}
              {lessonRef.dayMeta.totalDays > 1 && (
                <div style={{ fontSize: 11, color: D.text2 }}>
                  Day {lessonRef.dayMeta.dayIndex} of {lessonRef.dayMeta.totalDays}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: D.text2, fontStyle: "italic" }}>
              No lesson mapped — you can still add instructions for the sub.
            </div>
          )}

          {/* Standing bullets — locked read-only preview */}
          {filledStanding.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: D.text2,
                letterSpacing: "0.05em", textTransform: "uppercase",
                marginBottom: 8,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Lock size={10} />
                Always included
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  — edit in Persistent Settings above
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {filledStanding.map((bullet, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "6px 10px", borderRadius: 6,
                    background: D.bg2, border: `1px solid ${D.border1}`,
                    opacity: 0.72,
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: D.text2, flexShrink: 0, marginTop: 5,
                    }} />
                    <span style={{ fontSize: 12, color: D.text1, lineHeight: 1.5 }}>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-day editable bullets */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: D.text2,
              letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8,
            }}>
              {filledStanding.length > 0 ? "Additional instructions for this day" : "Sub instructions"}
            </div>
            <BulletEditor
              courseId={courseId}
              instructions={instructions}
              onChange={onInstructionsChange}
              color={c.color}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export default function SubPlanModal({
  dateKey,
  existingData,
  curricula,
  mappings,
  calendarConfig,
  onSave,
  onUnmark,
  onClose,
  pathwayColor,
}) {
  const isExisting = !!existingData;
  const mediaYear  = calendarConfig?.mediaYear || "media-a";

  // Day-specific note override (optional — adds below persistent intro)
  const [subNote, setSubNote] = useState(
    existingData?.subNote !== undefined ? existingData.subNote : ""
  );

  // Per-course per-day bullet additions
  const [courseInstructions, setCourseInstructions] = useState(() => {
    const init = {};
    for (const c of SUB_PLAN_COURSES) {
      const key = c.isMedia ? mediaYear : c.id;
      init[key] = existingData?.courses?.[key]?.instructions?.length
        ? [...existingData.courses[key].instructions]
        : [""];
    }
    return init;
  });

  // Standing bullets for read-only preview inside accordions
  const [standingBullets] = useState(() => loadStandingBullets());

  const [openCourse,   setOpenCourse]   = useState(SUB_PLAN_COURSES[0].id);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleCourse = (id) => setOpenCourse(prev => prev === id ? null : id);

  const updateCourseInstructions = (courseId, next) =>
    setCourseInstructions(prev => ({ ...prev, [courseId]: next }));

  const getPeriodLabel = (c) => {
    const key = c.isMedia ? "media" : c.id;
    const raw = calendarConfig?.periodsByCourse?.[key] || "";
    const periods = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (!periods.length) return null;
    return `Period${periods.length > 1 ? "s" : ""} ${periods.join(", ")}`;
  };

  const getLessonRef = (courseId) => {
    const mapping  = mappings?.[courseId];
    const dayMeta  = mapping?.[dateKey];
    if (!dayMeta || dayMeta.type !== "lesson") return null;
    const curriculum = curricula?.[courseId];
    if (!curriculum) return null;
    for (const unit of curriculum.units || []) {
      const lesson = unit.lessons?.find(l => l.id === dayMeta.lessonId);
      if (lesson) return { lesson, unit, dayMeta };
    }
    return null;
  };

  const handleSave = () => {
    const courses = {};
    for (const c of SUB_PLAN_COURSES) {
      const key     = c.isMedia ? mediaYear : c.id;
      const cleaned = (courseInstructions[key] || []).map(s => s.trim()).filter(Boolean);
      if (cleaned.length) courses[key] = { instructions: cleaned };
    }
    onSave({ subNote: subNote.trim(), courses });
  };

  const handleUnmark = () => {
    if (!window.confirm("Remove sub day flag from this day? All instructions will be cleared.")) return;
    onUnmark();
  };

  return (
    <Modal>
      {/* ── Fixed header */}
      <div style={{
        padding: "14px 24px 12px",
        borderBottom: `1.5px solid ${D.border1}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: D.bg2, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🧑‍🏫</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: D.text0 }}>
              {isExisting ? "Edit Sub Plan" : "Mark as Sub Day"}
            </div>
            <div style={{ fontSize: 12, color: D.text2, marginTop: 1 }}>
              {formatFullDate(dateKey)}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ ...iconBtn, background: D.bg3, border: `1px solid ${D.border1}`, borderRadius: 6 }}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Scrollable body */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "18px 24px 24px",
        background: D.bg1,
        display: "flex", flexDirection: "column", gap: 18,
      }}>

        {/* Persistent settings panel */}
        <PersistentSettingsPanel
          isOpen={settingsOpen}
          onToggle={() => setSettingsOpen(p => !p)}
        />

        {/* Day-specific note */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: D.text1, display: "block", marginBottom: 6 }}>
            Day-specific note
            <span style={{ fontWeight: 400, color: D.text2, marginLeft: 6 }}>
              — optional · printed below the persistent intro on this day only
            </span>
          </label>
          <AutoTextarea
            value={subNote}
            onChange={setSubNote}
            placeholder="e.g. Fire drill scheduled at 10:15 — please follow posted route."
            minRows={2}
          />
        </div>

        {/* Period config warning */}
        {!calendarConfig?.periodsByCourse && (
          <div style={{
            fontSize: 12, color: "#f59e0b", lineHeight: 1.5,
            padding: "9px 12px", borderRadius: 8,
            background: "#2d2000", border: "1px solid #6b4a00",
          }}>
            ⚠️ Periods aren't configured yet. Open{" "}
            <strong style={{ color: D.text0 }}>Phase 3 → Edit Calendar → Course Schedule</strong>{" "}
            to add them.
          </div>
        )}

        {/* Course accordions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: D.text2,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2,
          }}>
            Per-class instructions — click a class to expand
          </div>
          {SUB_PLAN_COURSES.map(c => {
            const courseId = c.isMedia ? mediaYear : c.id;
            return (
              <CourseSection
                key={courseId}
                c={c}
                courseId={courseId}
                mediaYear={mediaYear}
                periodLabel={getPeriodLabel(c)}
                lessonRef={getLessonRef(courseId)}
                instructions={courseInstructions[courseId] || [""]}
                onInstructionsChange={next => updateCourseInstructions(courseId, next)}
                isOpen={openCourse === courseId}
                onToggle={() => toggleCourse(courseId)}
                standingBullets={standingBullets[c.id] || []}
              />
            );
          })}
        </div>
      </div>

      {/* ── Fixed footer */}
      <div style={{
        padding: "12px 24px",
        borderTop: `1.5px solid ${D.border1}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: D.bg2, flexShrink: 0,
      }}>
        {isExisting ? (
          <button
            onClick={handleUnmark}
            style={{ ...btnStyle, fontSize: 12, color: "#f87171", borderColor: "#6b1a1a", background: "#2d0f0f" }}
          >
            <Trash2 size={13} /> Remove sub flag
          </button>
        ) : (
          <button onClick={onClose} style={btnStyle}>Cancel</button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {isExisting && <button onClick={onClose} style={btnStyle}>Cancel</button>}
          <button
            onClick={handleSave}
            style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor, fontWeight: 600 }}
          >
            🧑‍🏫 {isExisting ? "Save changes" : "Mark as sub day"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
