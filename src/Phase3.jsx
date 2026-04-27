import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, BookOpen,
  X, Check, SkipForward, Play, AlertTriangle, Settings,
  Plus, Trash2, Edit2, User, ExternalLink
} from "lucide-react";

// ─── CONSTANTS (mirrors Phase 1 & 2 design system) ───────────────────────────

const PATHWAYS = [
  {
    id: "tech",
    name: "Intro to Technology & Digital Innovation",
    shortName: "Tech & Innovation",
    color: "#1a56c4",
    courses: [
      { id: "intro-tech",         name: "Intro to Technology", grades: "6/7", color: "#1a56c4" },
      { id: "digital-innovation", name: "Digital Innovation",  grades: "7/8", color: "#0d9488" },
    ],
  },
  {
    id: "media",
    name: "Digital Media",
    shortName: "Digital Media",
    color: "#7c22d4",
    courses: [
      { id: "media-a", name: "Digital Media A", grades: "7/8" },
      { id: "media-b", name: "Digital Media B", grades: "8/9" },
    ],
  },
];

const LESSON_TYPE_META = {
  instruction:     { label: "Instruction",   accent: "#4d8ef0", bg: "#0d1f3d", border: "#1a3a6b" },
  classwork:       { label: "Classwork",     accent: "#f59e0b", bg: "#2d2000", border: "#6b4a00" },
  "group-project": { label: "Group Project", accent: "#22c55e", bg: "#0d2d1a", border: "#1a5433" },
  project:         { label: "Project",       accent: "#a855f7", bg: "#1a0d3d", border: "#381a6b" },
  assessment:      { label: "Assessment",    accent: "#f97316", bg: "#2d1a0d", border: "#6b3a1a" },
};

const STATUS_ORDER = ["planned", "in-progress", "taught", "skipped"];
const STATUS_META = {
  planned:      { label: "Planned",     color: "#5a6380", bg: "#1e2436", border: "#2a3050", icon: null },
  "in-progress":{ label: "In Progress", color: "#f59e0b", bg: "#2d2000", border: "#6b4a00", icon: Play },
  taught:       { label: "Taught",      color: "#22c55e", bg: "#0d2d1a", border: "#1a5433", icon: Check },
  skipped:      { label: "Skipped",     color: "#f87171", bg: "#2d0f0f", border: "#6b1a1a", icon: SkipForward },
};

const DAY_NAMES  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT  = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── THEME ───────────────────────────────────────────────────────────────────

const D = {
  bg0: "#0f1117", bg1: "#161b27", bg2: "#1e2436", bg3: "#252b40",
  border0: "#1e2436", border1: "#2a3050", border2: "#3a4468",
  text0: "#f0ede8", text1: "#9ca3b8", text2: "#5a6380",
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

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

function loadCurriculum(courseId) {
  try {
    const val = localStorage.getItem(`master-curriculum:${courseId}`);
    if (val) return JSON.parse(val);
  } catch (_) {}
  return null;
}

function loadWeeklyData(courseId) {
  try {
    const val = localStorage.getItem(`weekly-data:${courseId}`);
    if (val) return JSON.parse(val);
  } catch (_) {}
  return {};
}

function saveWeeklyData(courseId, data) {
  try {
    localStorage.setItem(`weekly-data:${courseId}`, JSON.stringify(data));
  } catch (_) {}
}

function loadCalendarConfig() {
  try {
    const val = localStorage.getItem("calendar-config");
    if (val) return JSON.parse(val);
  } catch (_) {}
  return null;
}

function saveCalendarConfig(config) {
  try {
    localStorage.setItem("calendar-config", JSON.stringify(config));
  } catch (_) {}
}

function loadMapping(courseId) {
  try {
    const val = localStorage.getItem(`lesson-mapping:${courseId}`);
    if (val) return JSON.parse(val);
  } catch (_) {}
  return null;
}

function saveMapping(courseId, data) {
  try {
    localStorage.setItem(`lesson-mapping:${courseId}`, JSON.stringify(data));
  } catch (_) {}
}

function loadSubDays() {
  try {
    const val = localStorage.getItem("sub-days");
    if (val) return JSON.parse(val);
  } catch (_) {}
  return {};
}

function saveSubDays(data) {
  try {
    localStorage.setItem("sub-days", JSON.stringify(data));
  } catch (_) {}
}

function loadSettings() {
  try {
    const val = localStorage.getItem("app-settings");
    if (val) return JSON.parse(val);
  } catch (_) {}
  return { selectedCourse: "intro-tech" };
}

function saveSettings(s) {
  try {
    localStorage.setItem("app-settings", JSON.stringify(s));
  } catch (_) {}
}

// ─── BELL RINGER HELPER (mirrors Phase 2) ────────────────────────────────────

function getBellRinger(lesson, dayIndex) {
  if (!lesson) return "";
  if (Array.isArray(lesson.bellRingers)) {
    return lesson.bellRingers[(dayIndex || 1) - 1] || "";
  }
  if (typeof lesson.bellRinger === "string" && lesson.bellRinger) {
    return dayIndex === 1 ? lesson.bellRinger : "";
  }
  return "";
}

// ─── DATE UTILITIES ──────────────────────────────────────────────────────────

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateString, n) {
  const d = parseDate(dateString);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

function getMondayOf(dateString) {
  const d = parseDate(dateString);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return dateStr(d);
}

function todayStr() {
  return dateStr(new Date());
}

function isWeekend(dateString) {
  const d = parseDate(dateString);
  return d.getDay() === 0 || d.getDay() === 6;
}

function getSchoolDays(startDate, endDate, nonInstructional = []) {
  const niSet = new Set(nonInstructional);
  const days = [];
  let cur = startDate;
  while (cur <= endDate) {
    if (!isWeekend(cur) && !niSet.has(cur)) days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

// Get Monday of the first week of a given month (year, monthIndex 0-based)
function getFirstMondayOfMonthGrid(year, month) {
  // First day of month
  const first = new Date(year, month, 1);
  return getMondayOf(dateStr(first));
}

// Build a 2D grid of weeks for a given month: array of weeks, each week is [Mon..Fri] dateStrings
function buildMonthGrid(year, month) {
  const startMonday = getFirstMondayOfMonthGrid(year, month);
  const lastDay = dateStr(new Date(year, month + 1, 0)); // last day of month
  const weeks = [];
  let monday = startMonday;
  while (true) {
    const week = [0, 1, 2, 3, 4].map(i => addDays(monday, i));
    weeks.push(week);
    // Stop after we've passed the end of the month
    if (week[4] >= lastDay) break;
    monday = addDays(monday, 7);
  }
  return weeks;
}

function formatMonthDay(dateString) {
  const d = parseDate(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── MAPPING UTILITIES (mirrored from Phase 2) ───────────────────────────────

function generateMapping(units, schoolDays) {
  const mapping = {};
  const overflow = [];
  let dayIdx = 0;
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      const count = lesson.estimatedDays || 1;
      let placed = 0;
      for (let d = 0; d < count; d++) {
        if (dayIdx < schoolDays.length) {
          mapping[schoolDays[dayIdx]] = { type: "lesson", lessonId: lesson.id, unitId: unit.id, dayIndex: d + 1, totalDays: count };
          dayIdx++; placed++;
        }
      }
      if (placed < count) overflow.push({ lessonId: lesson.id, unitId: unit.id, daysNeeded: count - placed });
    }
  }
  return { mapping, overflow };
}

function getLessonDays(mapping, lessonId) {
  const entries = Object.entries(mapping)
    .filter(([, m]) => m.type === "lesson" && m.lessonId === lessonId)
    .sort((a, b) => a[0] < b[0] ? -1 : 1);

  // Use totalDays from the first entry as a cap to avoid returning orphaned days
  const totalDays = entries[0]?.[1]?.totalDays;
  const days = entries.map(([d]) => d);
  return totalDays ? days.slice(0, totalDays) : days;
}

function shiftFrom(mapping, overflow, fromDate, n, schoolDays) {
  const sdIdx = {};
  schoolDays.forEach((d, i) => { sdIdx[d] = i; });
  const before = {};
  const toShift = [];
  for (const [date, meta] of Object.entries(mapping)) {
    if (date < fromDate) before[date] = meta;
    else toShift.push([date, meta]);
  }
  toShift.sort((a, b) => a[0] < b[0] ? -1 : 1);
  const newMapping = { ...before };
  const newOverflow = [...overflow];
  for (const [date, meta] of toShift) {
    const curIdx = sdIdx[date];
    if (curIdx === undefined) continue;
    const newIdx = curIdx + n;
    if (newIdx >= 0 && newIdx < schoolDays.length) {
      newMapping[schoolDays[newIdx]] = meta;
    } else if (newIdx >= schoolDays.length && meta.type === "lesson" && meta.dayIndex === 1) {
      newOverflow.push({ lessonId: meta.lessonId, unitId: meta.unitId, daysNeeded: meta.totalDays });
    }
  }
  return { mapping: newMapping, overflow: newOverflow };
}

function swapDays(mapping, dateA, dateB) {
  const metaA = mapping[dateA];
  const metaB = mapping[dateB];
  if (!metaA && !metaB) return { mapping, error: "Nothing to swap." };

  const daysA = metaA?.type === "lesson" ? getLessonDays(mapping, metaA.lessonId) : metaA ? [dateA] : [dateA];
  const daysB = metaB?.type === "lesson" ? getLessonDays(mapping, metaB.lessonId) : metaB ? [dateB] : [dateB];

  if (daysA.length > 1 || daysB.length > 1) {
    if (daysA.length !== daysB.length) {
      return { mapping, error: `Can't swap: item A is ${daysA.length} day${daysA.length!==1?"s":""} and item B is ${daysB.length} day${daysB.length!==1?"s":""}. Shorten or extend one first.` };
    }
  }

  const newMapping = { ...mapping };
  const maxLen = Math.max(daysA.length, daysB.length);
  for (let i = 0; i < maxLen; i++) {
    const da = daysA[i];
    const db = daysB[i];
    if (da && db) {
      const tmp = newMapping[da];
      newMapping[da] = newMapping[db] ? { ...newMapping[db] } : undefined;
      newMapping[db] = tmp ? { ...tmp } : undefined;
      if (!newMapping[da]) delete newMapping[da];
      if (!newMapping[db]) delete newMapping[db];
    }
  }
  return { mapping: newMapping };
}

// ─── COURSE HELPERS ──────────────────────────────────────────────────────────

function getCourse(courseId) {
  for (const p of PATHWAYS) {
    const c = p.courses.find(c => c.id === courseId);
    if (c) return { ...c, pathway: p };
  }
  return null;
}

function getPathwayColor(courseId) {
  const c = getCourse(courseId);
  if (!c) return "#1a56c4";
  if (courseId === "intro-tech") return "#1a56c4";
  if (courseId === "digital-innovation") return "#0d9488";
  return "#7c22d4";
}

// ─── CONTEXT MENU COMPONENT ──────────────────────────────────────────────────

function ContextMenuWrapper({ x, y, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    // Use click (not mousedown) so clicking inside inputs doesn't trigger close
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // Delay to avoid catching the right-click that opened the menu
    const tid = setTimeout(() => document.addEventListener("click", handler), 100);
    return () => { clearTimeout(tid); document.removeEventListener("click", handler); };
  }, [onClose]);

  // Clamp to viewport
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    setPos({
      left: x + r.width > vw ? x - r.width : x,
      top: y + r.height > vh ? y - r.height : y,
    });
  }, [x, y]);

  return (
    <div ref={ref} style={{
      position: "fixed", left: pos.left, top: pos.top,
      zIndex: 9999, background: D.bg1, border: `1.5px solid ${D.border2}`,
      borderRadius: 10, boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
      minWidth: 190, overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function CtxItem({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%",
        padding: "9px 14px", background: "none", border: "none",
        cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
        fontSize: 13, color: disabled ? D.text2 : danger ? "#f87171" : D.text0,
        textAlign: "left",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = D.bg3; }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
    >
      {Icon && <Icon size={14} color={disabled ? D.text2 : danger ? "#f87171" : D.text1} />}
      {label}
    </button>
  );
}

function CtxDivider() {
  return <div style={{ height: 1, background: D.border1, margin: "3px 0" }} />;
}

// ─── LESSON CONTEXT MENU ─────────────────────────────────────────────────────

function LessonContextMenu({ x, y, dateKey, dayMeta, isSubDay, onAddDay, onRemoveDay, onInsertBlankDay, onRemoveDayPull, onDeleteLesson, onInsertBlock, onDuplicate, onMoveToDate, onMarkSubDay, onUnmarkSubDay, onGoToWeek, onGoToLesson, onClose }) {
  const [blockLabel, setBlockLabel] = useState("");
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [subNote, setSubNote] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [moveToDate, setMoveToDate] = useState("");
  const [moveError, setMoveError] = useState("");

  const handleMoveConfirm = () => {
    if (!moveToDate) { setMoveError("Please select a date."); return; }
    setMoveError("");
    onMoveToDate(dateKey, moveToDate);
    onClose();
  };

  return (
    <ContextMenuWrapper x={x} y={y} onClose={onClose}>
      <div style={{ padding: "8px 12px 6px", fontSize: 11, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {dayMeta?.totalDays > 1 ? `Day ${dayMeta.dayIndex} of ${dayMeta.totalDays}` : "Lesson Day"}
      </div>
      <CtxDivider />

      {/* ── Day sizing */}
      <CtxItem icon={Plus} label="Add Day" onClick={() => { onAddDay(dateKey); onClose(); }} />
      <CtxItem icon={Trash2} label="Remove Day" onClick={() => { onRemoveDay(dateKey); onClose(); }} danger />
      <CtxDivider />

      {/* ── Blank day / pull */}
      <CtxItem icon={Plus} label="Insert Blank Day Here" onClick={() => { onInsertBlankDay(dateKey); onClose(); }} />
      <CtxItem icon={Trash2} label="Remove Day & Pull Forward" onClick={() => { onRemoveDayPull(dateKey); onClose(); }} danger />
      <CtxDivider />

      {/* ── Lesson-level ops */}
      <CtxItem icon={Trash2} label="Delete Entire Lesson" onClick={() => { onDeleteLesson(dateKey); onClose(); }} danger />
      <CtxItem icon={BookOpen} label="Duplicate Lesson" onClick={() => { onDuplicate(dateKey); onClose(); }} />

      {/* ── Insert block */}
      {!showBlockInput ? (
        <CtxItem icon={Calendar} label="Insert Block Before" onClick={(e) => { e.stopPropagation(); setShowBlockInput(true); setShowMoveInput(false); }} />
      ) : (
        <div style={{ padding: "6px 12px 8px" }} onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={blockLabel}
            onChange={e => setBlockLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { onInsertBlock(dateKey, blockLabel || "Event"); onClose(); }
              if (e.key === "Escape") setShowBlockInput(false);
            }}
            placeholder="Block label…"
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
          />
          <button
            onClick={() => { onInsertBlock(dateKey, blockLabel || "Event"); onClose(); }}
            style={{ ...btnStyle, width: "100%", justifyContent: "center", fontSize: 12, padding: "5px 10px", background: D.bg3, color: D.text0 }}
          >
            Insert Block
          </button>
        </div>
      )}

      {/* ── Move to Date */}
      {!showMoveInput ? (
        <CtxItem icon={ExternalLink} label={dayMeta?.totalDays > 1 ? `Move All ${dayMeta.totalDays} Days To…` : "Move to Date…"} onClick={(e) => { e.stopPropagation(); setShowMoveInput(true); setShowBlockInput(false); }} />
      ) : (
        <div style={{ padding: "6px 12px 8px" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 11, color: D.text2, marginBottom: 5 }}>
            {dayMeta?.totalDays > 1
              ? `Move all ${dayMeta.totalDays} days — source dates left empty`
              : "Source date left empty after move"}
          </div>
          <input
            type="date"
            autoFocus
            value={moveToDate}
            onChange={e => { setMoveToDate(e.target.value); setMoveError(""); }}
            onKeyDown={e => {
              if (e.key === "Enter") handleMoveConfirm();
              if (e.key === "Escape") setShowMoveInput(false);
            }}
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
          />
          {moveError && (
            <div style={{ fontSize: 11, color: "#f87171", marginBottom: 5 }}>{moveError}</div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleMoveConfirm}
              style={{ ...btnStyle, flex: 1, justifyContent: "center", fontSize: 12, padding: "5px 10px", background: "#1a56c4", color: "white", borderColor: "#1a56c4", fontWeight: 600 }}
            >
              Move Here
            </button>
            <button
              onClick={() => { setShowMoveInput(false); setMoveError(""); }}
              style={{ ...btnStyle, fontSize: 12, padding: "5px 10px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <CtxDivider />

      {/* ── Sub day */}
      {!showSubInput ? (
        <CtxItem icon={User} label="Mark as Sub Day" onClick={(e) => { e.stopPropagation(); setShowSubInput(true); }} />
      ) : (
        <div style={{ padding: "6px 12px 8px" }} onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={subNote}
            onChange={e => setSubNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { onMarkSubDay(dateKey, subNote); onClose(); }
              if (e.key === "Escape") setShowSubInput(false);
            }}
            placeholder="Note for sub (optional)…"
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
          />
          <button
            onClick={() => { onMarkSubDay(dateKey, subNote); onClose(); }}
            style={{ ...btnStyle, width: "100%", justifyContent: "center", fontSize: 12, padding: "5px 10px", background: D.bg3, color: D.text0 }}
          >
            Mark Sub Day
          </button>
        </div>
      )}
      {isSubDay && (
        <>
          <CtxDivider />
          <CtxItem icon={X} label="Remove Sub Flag" onClick={() => { onUnmarkSubDay(dateKey); onClose(); }} danger />
        </>
      )}
      <CtxDivider />
      <CtxItem icon={ExternalLink} label="Go to Week in Phase 2" onClick={() => { onGoToWeek(dateKey); onClose(); }} />
      {onGoToLesson && dayMeta?.lessonId && (
        <CtxItem icon={BookOpen} label="Open in Master Builder" onClick={() => { onGoToLesson(dayMeta.lessonId); onClose(); }} />
      )}
    </ContextMenuWrapper>
  );
}

// ─── BLOCK CONTEXT MENU ──────────────────────────────────────────────────────

function BlockContextMenu({ x, y, dateKey, currentLabel, onRemoveBlock, onEditBlock, onClose }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(currentLabel || "");

  return (
    <ContextMenuWrapper x={x} y={y} onClose={onClose}>
      <div style={{ padding: "8px 12px 6px", fontSize: 11, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Blocked Day
      </div>
      <CtxDivider />
      {!editing ? (
        <CtxItem icon={Edit2} label="Edit Label" onClick={(e) => { e.stopPropagation(); setEditing(true); }} />
      ) : (
        <div style={{ padding: "6px 12px 8px" }} onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { onEditBlock(dateKey, label); onClose(); }
              if (e.key === "Escape") setEditing(false);
            }}
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
          />
          <button
            onClick={() => { onEditBlock(dateKey, label); onClose(); }}
            style={{ ...btnStyle, width: "100%", justifyContent: "center", fontSize: 12, padding: "5px 10px", background: D.bg3, color: D.text0 }}
          >
            Save Label
          </button>
        </div>
      )}
      <CtxItem icon={Trash2} label="Remove Block" onClick={() => { onRemoveBlock(dateKey); onClose(); }} danger />
    </ContextMenuWrapper>
  );
}

// ─── SUB DAY CONTEXT MENU ────────────────────────────────────────────────────

function SubDayContextMenu({ x, y, dateKey, currentNote, onUnmark, onEditNote, onClose }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(currentNote || "");

  return (
    <ContextMenuWrapper x={x} y={y} onClose={onClose}>
      <div style={{ padding: "8px 12px 6px", fontSize: 11, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Sub Day
      </div>
      <CtxDivider />
      {!editing ? (
        <CtxItem icon={Edit2} label="Edit Note" onClick={(e) => { e.stopPropagation(); setEditing(true); }} />
      ) : (
        <div style={{ padding: "6px 12px 8px" }} onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { onEditNote(dateKey, note); onClose(); }
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Note for sub"
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
          />
          <button
            onClick={() => { onEditNote(dateKey, note); onClose(); }}
            style={{ ...btnStyle, width: "100%", justifyContent: "center", fontSize: 12, padding: "5px 10px", background: D.bg3, color: D.text0 }}
          >
            Save Note
          </button>
        </div>
      )}
      <CtxItem icon={X} label="Remove Sub Flag" onClick={() => { onUnmark(dateKey); onClose(); }} danger />
    </ContextMenuWrapper>
  );
}

// ─── EMPTY DAY CONTEXT MENU ──────────────────────────────────────────────────

function EmptyDayContextMenu({ x, y, dateKey, onRemoveDayPull, onInsertBlankDay, onInsertBlock, onClose }) {
  const [blockLabel, setBlockLabel] = useState("");
  const [showBlockInput, setShowBlockInput] = useState(false);

  return (
    <ContextMenuWrapper x={x} y={y} onClose={onClose}>
      <div style={{ padding: "8px 12px 6px", fontSize: 11, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Empty Day
      </div>
      <CtxDivider />
      <CtxItem
        icon={Plus}
        label="Insert Blank Day Here"
        onClick={() => { onInsertBlankDay(dateKey); onClose(); }}
      />
      <CtxItem
        icon={Trash2}
        label="Remove Day & Pull Forward"
        onClick={() => { onRemoveDayPull(dateKey); onClose(); }}
        danger
      />
      {!showBlockInput ? (
        <CtxItem
          icon={Calendar}
          label="Insert Block Here"
          onClick={(e) => { e.stopPropagation(); setShowBlockInput(true); }}
        />
      ) : (
        <div style={{ padding: "6px 12px 8px" }} onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={blockLabel}
            onChange={e => setBlockLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { onInsertBlock(dateKey, blockLabel || "Event"); onClose(); }
              if (e.key === "Escape") setShowBlockInput(false);
            }}
            placeholder="Block label…"
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
          />
          <button
            onClick={() => { onInsertBlock(dateKey, blockLabel || "Event"); onClose(); }}
            style={{ ...btnStyle, width: "100%", justifyContent: "center", fontSize: 12, padding: "5px 10px", background: D.bg3, color: D.text0 }}
          >
            Insert Block
          </button>
        </div>
      )}
    </ContextMenuWrapper>
  );
}

// ─── DAY POPUP ───────────────────────────────────────────────────────────────

function DayPopup({ dateKey, dayData, weeklyDayData, subDayData, lesson, unit, pathwayColor, onClose }) {
  const ref = useRef(null);
  const anchorRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const status = weeklyDayData?.status || "planned";
  const statusMeta = STATUS_META[status] || STATUS_META.planned;
  const StatusIcon = statusMeta.icon;
  const typeMeta = lesson ? (LESSON_TYPE_META[lesson.type] || LESSON_TYPE_META.instruction) : null;
  const isSubDay = !!subDayData;
  const isBlock = dayData?.type === "block";

  // Position popup — find the cell by dateKey attribute and anchor below/above it
  useEffect(() => {
    const cell = document.querySelector(`[data-datekey="${dateKey}"]`);
    if (!cell || !ref.current) return;
    const cr = cell.getBoundingClientRect();
    const pr = ref.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = cr.bottom + 8;
    let left = cr.left;
    if (top + pr.height > vh - 20) top = cr.top - pr.height - 8;
    if (left + pr.width > vw - 12) left = vw - pr.width - 12;
    if (left < 8) left = 8;
    setPos({ top, left });
  }, [dateKey]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        const cell = document.querySelector(`[data-datekey="${dateKey}"]`);
        if (cell && cell.contains(e.target)) return; // let DayCell toggle handle it
        onClose();
      }
    };
    const tid = setTimeout(() => document.addEventListener("click", handler), 100);
    return () => { clearTimeout(tid); document.removeEventListener("click", handler); };
  }, [onClose, dateKey]);

  const d = parseDate(dateKey);
  const dateLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div ref={ref} style={{
      position: "fixed", top: pos.top, left: pos.left,
      zIndex: 9990, width: 280,
      background: D.bg1, border: `1.5px solid ${typeMeta ? typeMeta.border : D.border2}`,
      borderRadius: 12, boxShadow: "0 16px 56px rgba(0,0,0,0.7)",
      overflow: "hidden",
    }}>
      {/* Header stripe */}
      <div style={{
        height: 3,
        background: typeMeta ? typeMeta.accent : isBlock ? "#f59e0b" : D.border2,
      }} />

      {/* Date + close */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 6px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: D.text2, letterSpacing: "0.04em" }}>{dateLabel}</span>
        <button onClick={onClose} style={{ ...iconBtn, padding: 3 }}><X size={13} /></button>
      </div>

      {/* Block content */}
      {isBlock && (
        <div style={{ padding: "4px 14px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>📅 {dayData.label || "Blocked Day"}</div>
          <div style={{ fontSize: 12, color: D.text2, marginTop: 4 }}>No lessons scheduled</div>
        </div>
      )}

      {/* Lesson content */}
      {lesson && (
        <div style={{ padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Type + status row */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 4,
              background: typeMeta.bg, color: typeMeta.accent, border: `1px solid ${typeMeta.border}`,
            }}>{typeMeta.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              padding: "2px 8px", borderRadius: 20,
              background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {StatusIcon && <StatusIcon size={9} />}
              {statusMeta.label}
            </span>
            {isSubDay && <span style={{ fontSize: 12 }}>🧑‍🏫</span>}
          </div>

          {/* Lesson title */}
          <div style={{ fontSize: 14, fontWeight: 700, color: D.text0, lineHeight: 1.35 }}>
            {lesson.title}
          </div>

          {/* Unit */}
          {unit && (
            <div style={{ fontSize: 12, color: D.text2 }}>
              {unit.title}
            </div>
          )}

          {/* Day progress */}
          {dayData.totalDays > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: D.bg3, overflow: "hidden" }}>
                <div style={{
                  width: `${(dayData.dayIndex / dayData.totalDays) * 100}%`,
                  height: "100%", background: typeMeta.accent, borderRadius: 2,
                }} />
              </div>
              <span style={{ fontSize: 11, color: D.text2, whiteSpace: "nowrap" }}>
                Day {dayData.dayIndex} of {dayData.totalDays}
              </span>
            </div>
          )}

          {/* Objective */}
          {lesson.objective && (
            <div style={{
              fontSize: 12, color: D.text1, lineHeight: 1.5,
              padding: "8px 10px", borderRadius: 7,
              background: D.bg2, border: `1px solid ${D.border1}`,
            }}>
              {lesson.objective}
            </div>
          )}

          {/* Bell ringer */}
          {getBellRinger(lesson, dayData.dayIndex) && (
            <div style={{
              fontSize: 12, color: D.text1, lineHeight: 1.5,
              padding: "8px 10px", borderRadius: 7,
              background: D.bg2, border: `1px solid ${D.border1}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                🔔 Bell Ringer
              </div>
              {getBellRinger(lesson, dayData.dayIndex)}
            </div>
          )}

          {/* Sub note */}
          {isSubDay && subDayData?.subNote && (
            <div style={{
              fontSize: 12, color: "#f59e0b", lineHeight: 1.4,
              padding: "6px 10px", borderRadius: 7,
              background: "#2d200030", border: "1px solid #6b4a0050",
            }}>
              🧑‍🏫 {subDayData.subNote}
            </div>
          )}

          {/* Weekly note */}
          {weeklyDayData?.note && (
            <div style={{
              fontSize: 12, color: D.text1, lineHeight: 1.4,
              padding: "6px 10px", borderRadius: 7,
              background: D.bg2, border: `1px solid ${D.border1}`,
            }}>
              💬 {weeklyDayData.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MONTH DAY CELL ──────────────────────────────────────────────────────────

function DayCell({
  dateKey, dayData, weeklyDayData, isSubDay, lesson, unit, isToday, isThisMonth,
  isNonInstructional, pathwayColor, dragSource, dragOverflow, onContextMenu,
  onDragStart, onDrop, onDropOverflow, onDragEnd, onClick,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const status = weeklyDayData?.status || "planned";
  const isBlock = dayData?.type === "block";
  const isLesson = dayData?.type === "lesson";
  const isEmpty = !dayData;

  const typeMeta = lesson ? (LESSON_TYPE_META[lesson.type] || LESSON_TYPE_META.instruction) : null;
  const statusMeta = STATUS_META[status] || STATUS_META.planned;

  // Determine bg and border
  let cellBg = D.bg2;
  let cellBorder = D.border1;
  let opacity = isThisMonth ? 1 : 0.4;

  if (isNonInstructional) {
    cellBg = D.bg1;
    opacity = isThisMonth ? 0.5 : 0.2;
  } else if (isBlock) {
    cellBg = "#1a150d";
    cellBorder = "#4a3010";
  } else if (isLesson && typeMeta) {
    cellBg = typeMeta.bg;
    cellBorder = typeMeta.border;
  }

  // Overflow placement mode = green highlight; swap mode = pathway color highlight
  if (isDragOver && !isNonInstructional) {
    if (dragOverflow) {
      cellBorder = "#22c55e";
      cellBg = "#0d2d1a";
    } else {
      cellBorder = pathwayColor;
      cellBg = pathwayColor + "18";
    }
  }

  // Non-instructional cells show red tint when dragging overflow over them
  if (isDragOver && isNonInstructional && dragOverflow) {
    cellBorder = "#f87171";
    cellBg = "#2d0f0f";
  }

  return (
    <div
      draggable={!isNonInstructional && !isEmpty && !dragOverflow}
      data-datekey={dateKey}
      onDragStart={() => onDragStart(dateKey)}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => {
        setIsDragOver(false);
        if (dragOverflow) {
          onDropOverflow(dateKey);
        } else {
          onDrop(dateKey);
        }
      }}
      onDragEnd={onDragEnd}
      onContextMenu={e => { if (!isNonInstructional) { e.preventDefault(); onContextMenu(e, dateKey); } }}
      onClick={() => onClick && onClick(dateKey)}
      style={{
        minHeight: 115, borderRadius: 8, padding: "7px 9px",
        background: cellBg, border: `1.5px solid ${cellBorder}`,
        opacity, cursor: isNonInstructional ? "default" : "pointer",
        position: "relative", overflow: "hidden",
        boxSizing: "border-box",
        transition: "border-color 0.15s, background 0.15s",
        outline: isToday ? `2px solid ${pathwayColor}` : "none",
        outlineOffset: -1,
      }}
    >
      {/* Date number */}
      <div style={{
        fontSize: 12, fontWeight: isToday ? 700 : 500,
        color: isToday ? pathwayColor : isThisMonth ? D.text1 : D.text2,
        marginBottom: 4, lineHeight: 1,
      }}>
        {parseDate(dateKey).getDate()}
        {isToday && (
          <span style={{
            marginLeft: 4, fontSize: 9, fontWeight: 700, padding: "1px 5px",
            borderRadius: 10, background: pathwayColor, color: "white",
            verticalAlign: "middle",
          }}>TODAY</span>
        )}
      </div>

      {/* Non-instructional */}
      {isNonInstructional && isThisMonth && (
        <div style={{ fontSize: 10, color: D.text2, fontStyle: "italic", marginTop: 2 }}>No school</div>
      )}

      {/* Block */}
      {isBlock && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#f59e0b",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>📅 Block</div>
          {dayData.label && (
            <div style={{ fontSize: 11, color: "#d4a017", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {dayData.label}
            </div>
          )}
        </div>
      )}

      {/* Lesson */}
      {isLesson && lesson && (
        <>
          {/* Type stripe */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: 3, background: typeMeta.accent, borderRadius: "0 6px 6px 0",
          }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: typeMeta.accent, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>
            {typeMeta.label}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 600, color: D.text0,
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            lineHeight: 1.35,
          }}>
            {lesson.title}
          </div>
          {dayData.totalDays > 1 && (
            <div style={{ fontSize: 11, color: D.text2, marginTop: 3 }}>
              {dayData.dayIndex}/{dayData.totalDays}d
            </div>
          )}
          {/* Status dot */}
          {status !== "planned" && (
            <div style={{
              position: "absolute", bottom: 5, left: 6,
              width: 6, height: 6, borderRadius: "50%",
              background: statusMeta.color,
            }} />
          )}
        </>
      )}

      {/* Sub day indicator */}
      {isSubDay && (
        <div style={{
          position: "absolute", top: 4, right: isLesson ? 8 : 4,
          fontSize: 12, lineHeight: 1,
        }}>🧑‍🏫</div>
      )}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "40px 16px 60px",
      backgroundColor: "rgba(5,7,15,0.85)",
      overflowY: "auto", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: D.bg1, borderRadius: 16,
        border: `1.5px solid ${D.border1}`,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        width: "100%", maxWidth: wide ? 860 : 660,
        overflow: "hidden", position: "relative",
        display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 80px)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── DISTRICT CALENDAR PRESETS ───────────────────────────────────────────────

const DISTRICT_PRESETS = {
  "ousd-2026-27-s1": {
    label: "OUSD 2026–27 Semester 1",
    semesterLabel: "Semester 1 2026–27",
    startDate: "2026-08-13",
    endDate: "2026-12-18",
    nonInstructional: [
      "2026-09-07", // Labor Day
      "2026-11-11", // Veterans Day
      "2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27", // Thanksgiving Break
    ],
  },
  "ousd-2026-27-s2": {
    label: "OUSD 2026–27 Semester 2",
    semesterLabel: "Semester 2 2026–27",
    startDate: "2027-01-11",
    endDate: "2027-06-08",
    nonInstructional: [
      "2027-01-18", // MLK Day
      "2027-02-15","2027-02-16","2027-02-17","2027-02-18","2027-02-19", // Presidents Week
      "2027-04-05","2027-04-06","2027-04-07","2027-04-08","2027-04-09", // Spring Break
      "2027-05-31", // Memorial Day
    ],
  },
  "ousd-2026-27-full": {
    label: "OUSD 2026–27 Full Year",
    semesterLabel: "2026–27 School Year",
    startDate: "2026-08-13",
    endDate: "2027-06-08",
    nonInstructional: [
      "2026-09-07",
      "2026-11-11",
      "2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27",
      "2027-01-18",
      "2027-02-15","2027-02-16","2027-02-17","2027-02-18","2027-02-19",
      "2027-04-05","2027-04-06","2027-04-07","2027-04-08","2027-04-09",
      "2027-05-31",
    ],
  },
};

// ─── CALENDAR SETUP MODAL ────────────────────────────────────────────────────
//
// CHANGES FROM PREVIOUS VERSION:
//   • Added "Course Schedule" section above Start New Year footer
//   • form.periodsByCourse: { "intro-tech": "3, 4, 7", "digital-innovation": "6", "media": "1" }
//   • form.mediaYear: "media-a" | "media-b" — replaces the floating mediaYear prop/state
//   • Digital Media row has inline Yr A / Yr B toggle + period input
//   • All other behavior (presets, NI days, Start New Year, Save) unchanged
//
// HOW TO READ in Phase 2 / Phase 3 / sub plan generator:
//   calendarConfig?.mediaYear          → "media-a" or "media-b"
//   calendarConfig?.periodsByCourse?.["intro-tech"]  → "3, 4, 7"
//   calendarConfig?.periodsByCourse?.["media"]       → "1"

function CalendarSetup({ config, onSave, onGenerate, onClose, onNewYear, pathwayColor }) {
  const today = todayStr();
  const [form, setForm] = useState(() => ({
    semesterLabel: "Semester 1 2026–27",
    startDate: today,
    endDate: addDays(today, 89),
    nonInstructional: [],
    periodsByCourse: {},
    mediaYear: "media-a",
    semester2StartDate: "",
    ...(config || {}),
  }));
  const [newNI, setNewNI] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [error, setError] = useState("");
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showNewYear, setShowNewYear] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Period helpers ──────────────────────────────────────────────────────────

  const updatePeriod = (courseKey, value) => {
    setForm(f => ({
      ...f,
      periodsByCourse: { ...(f.periodsByCourse || {}), [courseKey]: value },
    }));
  };

  // Rows for the Course Schedule section.
  // Digital Media A and B are the same physical class — one shared row keyed "media".
  const SCHEDULE_ROWS = [
    {
      key: "intro-tech",
      label: "Intro to Technology",
      grades: "6/7",
      color: "#1a56c4",
      hint: "e.g. 3, 4, 7",
    },
    {
      key: "digital-innovation",
      label: "Digital Innovation",
      grades: "7/8",
      color: "#0d9488",
      hint: "e.g. 6",
    },
  ];

  // ── Preset / NI / Save (unchanged) ─────────────────────────────────────────

  const loadPreset = (presetKey) => {
    const preset = DISTRICT_PRESETS[presetKey];
    if (!preset) return;
    setForm(f => ({
      semesterLabel: preset.semesterLabel,
      startDate: preset.startDate,
      endDate: preset.endDate,
      nonInstructional: [...preset.nonInstructional],
      periodsByCourse: f.periodsByCourse || {},
      mediaYear: f.mediaYear || "media-a",
    }));
    setError("");
  };

  const addNI = () => {
    const val = newNI.trim();
    if (!val) return;
    if (isWeekend(val)) { setError("That date is a weekend — only weekdays needed."); return; }
    if (form.nonInstructional.includes(val)) { setError("Already added."); return; }
    update("nonInstructional", [...form.nonInstructional, val].sort());
    setNewNI(""); setError("");
  };

  const addRange = () => {
    if (!rangeStart || !rangeEnd) { setError("Enter both a start and end date."); return; }
    if (rangeStart > rangeEnd) { setError("Start must be before end."); return; }
    const days = [];
    let cur = rangeStart;
    while (cur <= rangeEnd) {
      if (!isWeekend(cur) && !form.nonInstructional.includes(cur)) days.push(cur);
      cur = addDays(cur, 1);
    }
    if (!days.length) { setError("No weekdays found in that range."); return; }
    update("nonInstructional", [...form.nonInstructional, ...days].sort());
    setRangeStart(""); setRangeEnd(""); setShowRangePicker(false); setError("");
  };

  const removeNI = (d) => update("nonInstructional", form.nonInstructional.filter(x => x !== d));
  const clearAll = () => update("nonInstructional", []);

  const handleSave = () => {
    if (!form.startDate || !form.endDate) { setError("Start and end dates required."); return; }
    if (form.startDate >= form.endDate) { setError("End date must be after start date."); return; }
    onSave(form);
  };

  const schoolDayCount = getSchoolDays(form.startDate, form.endDate, form.nonInstructional).length;

  // Group NI days by proximity for display
  const groupedNI = [];
  let group = [];
  for (let i = 0; i < form.nonInstructional.length; i++) {
    const cur = form.nonInstructional[i];
    const prev = form.nonInstructional[i - 1];
    if (prev && parseDate(cur) - parseDate(prev) <= 7 * 24 * 60 * 60 * 1000 * 2) {
      group.push(cur);
    } else {
      if (group.length) groupedNI.push(group);
      group = [cur];
    }
  }
  if (group.length) groupedNI.push(group);

  return (
    <Modal onClose={onClose} wide>
      {/* ── Header ── */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: `1.5px solid ${D.border1}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: D.bg2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: pathwayColor,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Calendar size={14} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: D.text0 }}>Calendar Setup</h3>
            <div style={{ fontSize: 11, color: D.text2, marginTop: 1 }}>Global — applies to all courses</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ ...iconBtn, background: D.bg3, border: `1px solid ${D.border1}`, borderRadius: 6 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 20,
        background: D.bg1, flex: 1, overflowY: "auto",
      }}>

        {/* District presets */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: D.text0, display: "block", marginBottom: 6 }}>
            District Presets
          </label>
          <div style={{ fontSize: 12, color: D.text2, marginBottom: 10 }}>
            Oceanside USD 2026–27 — pre-loaded with all holidays and breaks
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(DISTRICT_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                style={{
                  ...btnStyle, fontSize: 12, padding: "6px 14px",
                  background: pathwayColor + "18", color: pathwayColor,
                  borderColor: pathwayColor + "50", fontWeight: 600,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Semester label */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: D.text0, display: "block", marginBottom: 6 }}>
            Semester Label
          </label>
          <input
            value={form.semesterLabel}
            onChange={e => update("semesterLabel", e.target.value)}
            style={inputStyle}
            placeholder="e.g. Semester 1 2026–27"
          />
        </div>

        {/* Start / end dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: D.text0, display: "block", marginBottom: 6 }}>
              First Day of School
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => update("startDate", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: D.text0, display: "block", marginBottom: 6 }}>
              Last Day of School
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => update("endDate", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Semester 2 start date */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: D.text0, display: "block", marginBottom: 6 }}>
            Semester 2 Start Date <span style={{ fontSize: 11, fontWeight: 400, color: D.text2 }}>(optional — resets bell work week counter)</span>
          </label>
          <input
            type="date"
            value={form.semester2StartDate || ""}
            onChange={e => update("semester2StartDate", e.target.value)}
            style={inputStyle}
          />
          {form.semester2StartDate && (
            <div style={{ fontSize: 11, color: D.text2, marginTop: 5 }}>
              Bell work week numbering resets to Week 1 on {form.semester2StartDate}.
              <button
                onClick={() => update("semester2StartDate", "")}
                style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 11, fontFamily: "inherit", padding: 0 }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Day count */}
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: D.bg2, border: `1px solid ${D.border1}`,
          fontSize: 13, color: D.text1,
        }}>
          📅 <strong style={{ color: pathwayColor }}>{schoolDayCount}</strong> instructional days
          {" · "}
          <span style={{ color: D.text2 }}>{form.nonInstructional.length} non-instructional days marked</span>
        </div>

        {/* Non-instructional days */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: D.text0 }}>Non-Instructional Days</label>
            {form.nonInstructional.length > 0 && (
              <button
                onClick={clearAll}
                style={{ ...btnStyle, fontSize: 11, padding: "3px 10px", color: "#f87171", borderColor: "#6b1a1a", background: "#2d0f0f" }}
              >
                Clear All
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={newNI}
              onChange={e => setNewNI(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={addNI}
              style={{ ...btnStyle, background: D.bg3, color: D.text0, fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Add Day
            </button>
            <button
              onClick={() => setShowRangePicker(r => !r)}
              style={{
                ...btnStyle,
                background: showRangePicker ? pathwayColor + "22" : D.bg3,
                color: showRangePicker ? pathwayColor : D.text1,
                borderColor: showRangePicker ? pathwayColor + "60" : D.border1,
                fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              Add Break
            </button>
          </div>

          {showRangePicker && (
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: D.bg2, border: `1px solid ${D.border1}`,
              marginBottom: 8, display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ fontSize: 12, color: D.text2 }}>
                Add all weekdays in a date range — perfect for breaks and holidays.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 11, color: D.text2, display: "block", marginBottom: 4 }}>Break Start</label>
                  <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: D.text2, display: "block", marginBottom: 4 }}>Break End</label>
                  <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} style={inputStyle} />
                </div>
                <button
                  onClick={addRange}
                  style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor, fontWeight: 600, height: 38, alignSelf: "end" }}
                >
                  Add
                </button>
              </div>
              {rangeStart && rangeEnd && rangeStart <= rangeEnd && (
                <div style={{ fontSize: 11, color: D.text2 }}>
                  {(() => {
                    let count = 0, cur = rangeStart;
                    while (cur <= rangeEnd) { if (!isWeekend(cur)) count++; cur = addDays(cur, 1); }
                    return `${count} weekday${count !== 1 ? "s" : ""} will be added`;
                  })()}
                </div>
              )}
            </div>
          )}

          {error && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#f87171" }}>{error}</p>}

          {groupedNI.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {groupedNI.map((group, gi) => (
                group.length === 1 ? (
                  <span key={gi} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, padding: "3px 10px", borderRadius: 20,
                    background: D.bg2, border: `1px solid ${D.border1}`, color: D.text1,
                  }}>
                    {formatMonthDay(group[0])}
                    <button
                      onClick={() => removeNI(group[0])}
                      style={{ background: "none", border: "none", cursor: "pointer", color: D.text2, padding: 0, display: "flex" }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ) : (
                  <span key={gi} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, padding: "3px 10px", borderRadius: 20,
                    background: D.bg2, border: `1px solid ${D.border1}`, color: D.text1,
                  }}>
                    {formatMonthDay(group[0])} – {formatMonthDay(group[group.length - 1])} ({group.length}d)
                    <button
                      onClick={() => update("nonInstructional", form.nonInstructional.filter(d => !group.includes(d)))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: D.text2, padding: 0, display: "flex" }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                )
              ))}
            </div>
          )}
        </div>

        {/* ── Course Schedule ──────────────────────────────────────────────────── */}
        <div>
          {/* Section divider */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
            paddingTop: 4,
          }}>
            <div style={{ flex: 1, height: 1, background: D.border1 }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: D.text0, whiteSpace: "nowrap" }}>
              Course Schedule
            </label>
            <div style={{ flex: 1, height: 1, background: D.border1 }} />
          </div>

          <div style={{ fontSize: 12, color: D.text2, marginBottom: 14, lineHeight: 1.5 }}>
            Enter the period numbers for each course, separated by commas. Used for sub plan generation.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SCHEDULE_ROWS.map(row => (
              <div
                key={row.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: D.bg2,
                  border: `1px solid ${D.border1}`,
                }}
              >
                {/* Course identity */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: row.color, flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.text0 }}>
                      {row.label}
                      <span style={{ fontSize: 11, fontWeight: 400, color: D.text2, marginLeft: 6 }}>
                        {row.grades}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Period input */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={(form.periodsByCourse || {})[row.key] || ""}
                  onChange={e => updatePeriod(row.key, e.target.value)}
                  placeholder={row.hint}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    padding: "7px 12px",
                    fontSize: 13,
                    textAlign: "center",
                    letterSpacing: "0.04em",
                  }}
                />
              </div>
            ))}

            {/* Digital Media row — period input + Yr A / Yr B toggle */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px",
              gap: 12,
              alignItems: "center",
              padding: "10px 14px",
              borderRadius: 8,
              background: D.bg2,
              border: `1px solid ${D.border1}`,
            }}>
              {/* Course identity + year toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: "#7c22d4", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: D.text0 }}>
                    Digital Media
                    <span style={{ fontSize: 11, fontWeight: 400, color: D.text2, marginLeft: 6 }}>7/8 · 8/9</span>
                  </div>
                  {/* Yr A / Yr B toggle */}
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {[
                      { id: "media-a", label: "Yr A" },
                      { id: "media-b", label: "Yr B" },
                    ].map(yr => (
                      <button
                        key={yr.id}
                        onClick={() => update("mediaYear", yr.id)}
                        style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: form.mediaYear === yr.id ? `1.5px solid #7c22d4` : `1px solid ${D.border1}`,
                          background: form.mediaYear === yr.id ? "#7c22d4" : D.bg3,
                          color: form.mediaYear === yr.id ? "white" : D.text2,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {yr.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Period input */}
              <input
                type="text"
                inputMode="numeric"
                value={(form.periodsByCourse || {})["media"] || ""}
                onChange={e => updatePeriod("media", e.target.value)}
                placeholder="e.g. 1, 5"
                style={{
                  ...inputStyle,
                  width: "100%",
                  padding: "7px 12px",
                  fontSize: 13,
                  textAlign: "center",
                  letterSpacing: "0.04em",
                }}
              />
            </div>
          </div>
        </div>
        {/* ── end Course Schedule ─────────────────────────────────────────────── */}

      </div>

      {/* ── Start New Year (unchanged) ── */}
      <div style={{ borderTop: `1.5px solid ${D.border1}`, background: "#0f1117" }}>
        {!showNewYear ? (
          <button
            onClick={() => setShowNewYear(true)}
            style={{ width: "100%", padding: "12px 24px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = "#1e2436"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <span style={{ fontSize: 14 }}>🔄</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text1 }}>Start New Year</div>
              <div style={{ fontSize: 11, color: D.text2 }}>Export notes & statuses, then reset for a fresh semester</div>
            </div>
            <ChevronRight size={14} color={D.text2} style={{ marginLeft: "auto" }} />
          </button>
        ) : (
          <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: D.text0 }}>Start New Year</span>
              <button onClick={() => setShowNewYear(false)} style={{ ...iconBtn, marginLeft: "auto", padding: 4 }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.6, padding: "10px 12px", background: D.bg2, borderRadius: 8, border: `1px solid ${D.border1}` }}>
              This will:<br />
              <strong style={{ color: D.text1 }}>1.</strong> Download a backup of all lesson statuses and reflection notes<br />
              <strong style={{ color: D.text1 }}>2.</strong> Reset all statuses to Planned<br />
              <strong style={{ color: D.text1 }}>3.</strong> Clear all daily reflection notes<br />
              <strong style={{ color: D.text1 }}>4.</strong> Clear all lesson mappings and overflow<br />
              <strong style={{ color: D.text1 }}>5.</strong> Keep your master curriculum and calendar settings unchanged
            </div>
            <div style={{ fontSize: 12, color: "#f59e0b", background: "#2d2000", border: "1px solid #6b4a00", borderRadius: 6, padding: "8px 12px" }}>
              ⚠️ Update your semester dates above before or after clicking — the new mapping will be generated when you save.
            </div>
            <button
              onClick={onNewYear}
              style={{ ...btnStyle, background: "#dc2626", color: "white", borderColor: "#dc2626", fontWeight: 600, justifyContent: "center" }}
            >
              Export backup & reset for new year
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "14px 24px",
        borderTop: `1.5px solid ${D.border1}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        background: D.bg2,
      }}>
        {/* Generate button with warning */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => {
              if (window.confirm("Generate Full Schedule will overwrite your existing lesson placements for all courses. Your calendar settings, lesson statuses, and notes are kept.\n\nContinue?")) {
                handleSave();
                onGenerate && onGenerate();
              }
            }}
            style={{ ...btnStyle, background: "#2d1a0d", color: "#f97316", borderColor: "#6b3a1a", fontWeight: 600 }}
          >
            🔄 Generate Full Schedule
          </button>
          <span style={{ fontSize: 11, color: D.text2 }}>Overwrites existing placements</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button
            onClick={handleSave}
            style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor, fontWeight: 600 }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── DRAG ACTION MODAL ───────────────────────────────────────────────────────
// Shown whenever a drag lands on an occupied cell (or an empty cell that won't fit).
// Props:
//   draggedLesson  — { lessonId, unitId, totalDays, title } — what's being dragged
//   targetDateKey  — where it's being dropped
//   targetMeta     — mapping entry at target (may be null for empty-but-no-room case)
//   targetLesson   — lesson object at target (may be null)
//   isLibraryDrag  — true when dragging from the sidebar
//   overflowWarning — number of lessons that will be pushed to overflow (0 = fits fine)
//   schoolDays     — full array of school day strings
//   onInsert       — () => void
//   onOverwrite    — () => void
//   onSwap         — () => void  (only called when offered)
//   onCancel       — () => void

function DragActionModal({
  draggedLesson, targetDateKey, targetMeta, targetLesson,
  isLibraryDrag, overflowWarning, alreadyScheduled, occupiedCount,
  onInsert, onOverwrite, onSwap, onCancel,
}) {
  const hasTarget = !!targetMeta;
  const targetIsLesson = targetMeta?.type === "lesson";
  const sameLength = targetIsLesson && draggedLesson.totalDays === targetMeta.totalDays;
  const canSwap = !isLibraryDrag && sameLength && hasTarget;

  const formatDate = (dk) => {
    if (!dk) return "";
    const d = parseDate(dk);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const btnBase = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    border: "1.5px solid", cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s", width: "100%",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(5,7,15,0.80)", backdropFilter: "blur(4px)",
    }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: D.bg1, borderRadius: 14,
        border: `1.5px solid ${D.border2}`,
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        width: "100%", maxWidth: 440, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: D.bg2, padding: "14px 18px 12px", borderBottom: `1px solid ${D.border1}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.text0, marginBottom: 2 }}>
            {isLibraryDrag ? "Place Lesson" : "Move Lesson"}
          </div>
          <div style={{ fontSize: 12, color: D.text2 }}>Choose how to handle this change</div>
        </div>

        {/* Preview */}
        <div style={{
          margin: "14px 18px 0",
          background: D.bg2, borderRadius: 9, padding: "12px 14px",
          display: "grid", gridTemplateColumns: "1fr 28px 1fr", gap: 6, alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: D.text2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
              {isLibraryDrag ? "From Library" : "Moving"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: D.text0, lineHeight: 1.3 }}>
              {draggedLesson.title}
            </div>
            <div style={{ fontSize: 11, color: D.text2, marginTop: 2 }}>
              {draggedLesson.totalDays}d
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: 18, color: D.text2 }}>→</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: D.text2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
              {formatDate(targetDateKey)}
            </div>
            {targetLesson ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text0, lineHeight: 1.3 }}>
                  {targetLesson.title}
                </div>
                <div style={{ fontSize: 11, color: D.text2, marginTop: 2 }}>
                  {occupiedCount && occupiedCount > 1
                    ? `${occupiedCount} of ${draggedLesson.totalDays} slots occupied`
                    : `${targetMeta?.totalDays}d already here`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: D.text2, fontStyle: "italic" }}>
                {occupiedCount > 0 ? `${occupiedCount} slot${occupiedCount !== 1 ? "s" : ""} occupied` : "Empty"}
              </div>
            )}
          </div>
        </div>

        {/* Overflow warning */}
        {overflowWarning > 0 && (
          <div style={{
            margin: "10px 18px 0",
            background: "#2d1a0d", border: "1.5px solid #6b3a1a", borderRadius: 8,
            padding: "9px 12px", display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <AlertTriangle size={14} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "#f97316", lineHeight: 1.5 }}>
              Inserting here will push {overflowWarning} lesson{overflowWarning !== 1 ? "s" : ""} past the end of the semester into overflow.
            </div>
          </div>
        )}

        {/* Already scheduled warning */}
        {alreadyScheduled && (
          <div style={{
            margin: "10px 18px 0",
            background: "#1a0d2d", border: "1.5px solid #381a6b", borderRadius: 8,
            padding: "9px 12px", display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <AlertTriangle size={14} color="#a855f7" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "#a855f7", lineHeight: 1.5 }}>
              This lesson is already scheduled on the calendar. Placing it again will create a second instance.
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: "14px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Swap — only when same length, calendar-to-calendar */}
          {canSwap && (
            <button
              onClick={onSwap}
              style={{ ...btnBase, background: "#0d1f3d", color: "#4d8ef0", borderColor: "#1a3a6b" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1a3a6b"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0d1f3d"; }}
            >
              ⇄ Swap Days
            </button>
          )}

          {/* Insert */}
          <button
            onClick={onInsert}
            style={{ ...btnBase, background: "#0d2d1a", color: "#22c55e", borderColor: "#1a5433" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1a5433"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0d2d1a"; }}
          >
            → {overflowWarning > 0 ? "Insert Anyway" : "Insert"} — shift everything forward
          </button>

          {/* Overwrite — show when target is occupied OR when lesson won't fit (force-place, truncated) */}
          {(hasTarget || overflowWarning > 0) && (
            <button
              onClick={onOverwrite}
              style={{ ...btnBase, background: D.bg2, color: D.text1, borderColor: D.border2 }}
              onMouseEnter={e => { e.currentTarget.style.background = D.bg3; }}
              onMouseLeave={e => { e.currentTarget.style.background = D.bg2; }}
            >
              ↗ Overwrite — {hasTarget ? "existing lesson left empty" : "place here, no shifting"}
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={onCancel}
            style={{ ...btnBase, background: "none", color: D.text2, borderColor: "transparent", fontWeight: 400 }}
            onMouseEnter={e => { e.currentTarget.style.color = D.text1; }}
            onMouseLeave={e => { e.currentTarget.style.color = D.text2; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "#2d1a0d", border: "1.5px solid #f97316",
      borderRadius: 10, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 480, pointerEvents: "none",
    }}>
      <AlertTriangle size={14} color="#f97316" />
      <span style={{ fontSize: 13, color: "#f97316" }}>{message}</span>
    </div>
  );
}

// ─── OVERFLOW TRAY ───────────────────────────────────────────────────────────

function OverflowTray({ overflow, lessonMap, unitMap, expanded, onToggle, onDragStart, onDragEnd, onSkip, onAppend, pathwayColor }) {
  if (overflow.length === 0) return null;

  return (
    <div style={{
      margin: "0 24px 24px", maxWidth: 1440, marginLeft: "auto", marginRight: "auto",
      borderRadius: 10, border: "1.5px solid #6b3a1a", overflow: "hidden", background: "#1a100a",
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#2d1a0d"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <AlertTriangle size={14} color="#f97316" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316", flex: 1 }}>
          {overflow.length} lesson{overflow.length !== 1 ? "s" : ""} outside the semester
        </span>
        <span style={{ fontSize: 11, color: "#9a5a2a" }}>
          {expanded ? "▲ collapse" : "▼ expand"}
        </span>
      </button>

      {/* Cards */}
      {expanded && (
        <div style={{ borderTop: "1px solid #3a1a0a" }}>
          {overflow.map((ov, i) => {
            const lesson = lessonMap[ov.lessonId];
            const unit = unitMap[ov.unitId];
            const typeMeta = LESSON_TYPE_META[lesson?.type] || LESSON_TYPE_META.instruction;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px",
                borderBottom: i < overflow.length - 1 ? "1px solid #2a1508" : "none",
              }}>
                {/* Draggable lesson card */}
                <div
                  draggable
                  onDragStart={() => onDragStart(ov)}
                  onDragEnd={onDragEnd}
                  style={{
                    display: "flex", alignItems: "stretch", gap: 0, flex: 1, minWidth: 0,
                    borderRadius: 8, border: `1.5px solid ${typeMeta.border}`,
                    background: typeMeta.bg, cursor: "grab",
                    userSelect: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  <div style={{ width: 4, background: typeMeta.accent, borderRadius: "6px 0 0 6px", flexShrink: 0 }} />
                  <div style={{ padding: "8px 10px", flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: typeMeta.accent, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 3 }}>
                      {typeMeta.label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                      {lesson?.title || "Unknown lesson"}
                    </div>
                    <div style={{ fontSize: 11, color: "#9a5a2a" }}>
                      {unit?.title}
                      {ov.daysNeeded > 1 && <span style={{ marginLeft: 5, color: "#6b3a1a" }}>· {ov.daysNeeded}d</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onAppend(i)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: "1px solid #f97316", background: "#f9731618", color: "#f97316",
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9731630"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f9731618"}
                    title="Append to end of semester"
                  >
                    + Append
                  </button>
                  <button
                    onClick={() => onSkip(i)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                      border: "1px solid #6b3a1a", background: "none", color: "#9a5a2a",
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#3a1a0a"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                    title="Skip this lesson for the semester"
                  >
                    Skip
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expanded && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid #3a1a0a", fontSize: 11, color: "#6b3a1a" }}>
          Drag onto any instructional day to insert before that lesson · Append adds to end of semester · Skipped lessons stay in your master curriculum
        </div>
      )}
    </div>
  );
}


// ─── LESSON LIBRARY SIDEBAR ──────────────────────────────────────────────────

function LessonLibrarySidebar({ curriculum, calendarConfig, viewMonth, viewYear, pathwayColor, semFilter, onSemFilterChange, onDragStart, onDragEnd, onClose }) {
  const [expandedUnits, setExpandedUnits] = useState({});

  const units = curriculum?.units || [];

  // Determine current semester based on view month/year and semester2StartDate
  const currentViewDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const inSem2 = calendarConfig?.semester2StartDate
    ? currentViewDate >= calendarConfig.semester2StartDate
    : false;
  const autoSem = inSem2 ? "Spring" : "Fall";

  // Filter units by semester
  const filteredUnits = units.filter(u => {
    const ef = semFilter === "auto" ? autoSem : semFilter;
    if (ef === "all") return true;
    if (!u.semester) return true; // no tag — show always
    return u.semester === ef;
  });

  const toggleUnit = (uid) => setExpandedUnits(e => ({ ...e, [uid]: !e[uid] }));
  const isUnitExpanded = (uid) => expandedUnits[uid] === true; // default collapsed

  const semLabel = semFilter === "auto" ? autoSem : semFilter === "all" ? "All" : semFilter;

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderRight: `1.5px solid ${D.border1}`,
      background: D.bg1,
      display: "flex", flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: `1px solid ${D.border0}`,
        display: "flex", alignItems: "center", gap: 8,
        background: D.bg2, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14 }}>📚</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: D.text0, flex: 1 }}>Lesson Library</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: D.text2, padding: 2, display: "flex" }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
        </button>
      </div>

      {/* Semester filter */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${D.border0}`, display: "flex", gap: 4, flexShrink: 0 }}>
        {[
          { value: "auto", label: `Auto (${autoSem})` },
          { value: "Fall",   label: "Fall" },
          { value: "Spring", label: "Spring" },
          { value: "all",    label: "All" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => onSemFilterChange(opt.value)}
            style={{
              flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 11,
              fontWeight: semFilter === opt.value ? 600 : 400,
              border: semFilter === opt.value ? `1.5px solid ${pathwayColor}` : `1px solid ${D.border1}`,
              background: semFilter === opt.value ? pathwayColor + "22" : D.bg3,
              color: semFilter === opt.value ? pathwayColor : D.text2,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Drag hint */}
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${D.border0}`, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: D.text2 }}>Drag a lesson onto a calendar date to place it</span>
      </div>

      {/* Unit list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filteredUnits.length === 0 && (
          <div style={{ padding: "20px 14px", fontSize: 12, color: D.text2, textAlign: "center", fontStyle: "italic" }}>
            No {semLabel} units found
          </div>
        )}
        {filteredUnits.map(unit => {
          const isExpanded = isUnitExpanded(unit.id);
          const totalDays = (unit.lessons || []).reduce((s, l) => s + (l.estimatedDays || 1), 0);
          return (
            <div key={unit.id}>
              {/* Unit header */}
              <div
                style={{
                  display: "flex", alignItems: "center",
                  borderBottom: `1px solid ${D.border0}`,
                  background: D.bg2,
                }}
              >
                {/* Expand toggle */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 4px 8px 14px", background: "none", border: "none",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    minWidth: 0, overflow: "hidden",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = D.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span style={{ fontSize: 11, color: D.text2, transform: isExpanded ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s", flexShrink: 0 }}>▶</span>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: D.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {unit.title}
                    </div>
                    <div style={{ fontSize: 10, color: D.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(unit.lessons || []).length} lessons · {totalDays} days
                      {unit.semester && (
                        <span style={{
                          marginLeft: 6,
                          color: unit.semester === "Fall" ? "#f59e0b" : unit.semester === "Spring" ? "#22c55e" : pathwayColor,
                          fontWeight: 600,
                        }}>
                          {unit.semester}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {/* Unit drag handle — always visible */}
                <div
                  draggable
                  title="Drag to place entire unit on calendar"
                  onDragStart={e => {
                    e.stopPropagation();
                    onDragStart(null, unit);
                    e.dataTransfer.setData("text/plain", JSON.stringify({ unitId: unit.id, wholeUnit: true }));
                  }}
                  onDragEnd={onDragEnd}
                  style={{
                    padding: "0 12px", cursor: "grab", color: D.text2, flexShrink: 0,
                    fontSize: 16, userSelect: "none",
                    display: "flex", alignItems: "center", alignSelf: "stretch",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = pathwayColor}
                  onMouseLeave={e => e.currentTarget.style.color = D.text2}
                >
                  ⠿
                </div>
              </div>

              {/* Lessons */}
              {isExpanded && (unit.lessons || []).map(lesson => {
                const typeMeta = LESSON_TYPE_META[lesson.type] || LESSON_TYPE_META.instruction;
                return (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={e => {
                      e.stopPropagation();
                      onDragStart(lesson, unit);
                      // Store in dataTransfer as fallback
                      e.dataTransfer.setData("text/plain", JSON.stringify({ lessonId: lesson.id, unitId: unit.id }));
                    }}
                    onDragEnd={onDragEnd}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "7px 14px 7px 22px",
                      borderBottom: `1px solid ${D.border0}`,
                      cursor: "grab", userSelect: "none",
                      borderLeft: `3px solid ${typeMeta.accent}`,
                      background: D.bg1,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = D.bg2}
                    onMouseLeave={e => e.currentTarget.style.background = D.bg1}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: D.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                        {lesson.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: typeMeta.bg, color: typeMeta.accent,
                          border: `1px solid ${typeMeta.border}`, textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}>
                          {typeMeta.label}
                        </span>
                        <span style={{ fontSize: 10, color: D.text2 }}>
                          {lesson.estimatedDays || 1}d
                        </span>
                      </div>
                      {lesson.objective && (
                        <div style={{
                          fontSize: 10, color: D.text2, marginTop: 4, lineHeight: 1.45,
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>
                          {lesson.objective}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Phase3({ isActive, selectedCourse: selectedCourseProp, onCourseChange, onCalendarSaved, onGoToWeek, onGoToLesson }) {
  const today = todayStr();
  const todayDate = parseDate(today);

  // ── State — initialized from App's lifted props
  const [selectedCourse, setSelectedCourse] = useState(selectedCourseProp || "intro-tech");
  const [curriculum, setCurriculum] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [overflow, setOverflow] = useState([]);
  const [weeklyData, setWeeklyData] = useState({});
  const [calendarConfig, setCalendarConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [dragSource, setDragSource] = useState(null);
  const [dragOverflow, setDragOverflow] = useState(null);
  const [overflowExpanded, setOverflowExpanded] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySemFilter, setLibrarySemFilter] = useState("auto"); // "auto" | "all" | "Fall" | "Spring"
  const [libraryDragLesson, setLibraryDragLesson] = useState(null); // { lesson, unit }
  const [contextMenu, setContextMenu] = useState(null);
  const [popup, setPopup] = useState(null); // { dateKey }
  const [swapError, setSwapError] = useState(null);
  const [dragActionModal, setDragActionModal] = useState(null); // { draggedLesson, targetDateKey, targetMeta, targetLesson, isLibraryDrag, overflowWarning, pendingDragSource, pendingLibraryDrag }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { dateKey, title, dayCount }
  const [subDays, setSubDays] = useState({});

  // ── Derived data
  const pathwayColor = getPathwayColor(selectedCourse);
  const course = getCourse(selectedCourse);
  const mediaYear = calendarConfig?.mediaYear || "media-a";

  const niSet = new Set(calendarConfig?.nonInstructional || []);
  const schoolDays = calendarConfig
    ? getSchoolDays(calendarConfig.startDate, calendarConfig.endDate, calendarConfig.nonInstructional)
    : [];

  const isInSemester = (dateKey) =>
    calendarConfig
      ? dateKey >= calendarConfig.startDate && dateKey <= calendarConfig.endDate
      : false;

  // Build lesson and unit maps
  const lessonMap = {};
  const unitMap = {};
  if (curriculum) {
    for (const unit of curriculum.units || []) {
      unitMap[unit.id] = unit;
      for (const lesson of unit.lessons || []) {
        lessonMap[lesson.id] = lesson;
      }
    }
  }

  // ── Always follow App's course selection — App is the single source of truth
  useEffect(() => {
    if (selectedCourseProp) setSelectedCourse(selectedCourseProp);
  }, [selectedCourseProp]);

  useEffect(() => {
    setLoading(true);
    const cur = loadCurriculum(selectedCourse);
    const mapData = loadMapping(selectedCourse);
    const wd = loadWeeklyData(selectedCourse);
    const cc = loadCalendarConfig();
    setCurriculum(cur);
    setMapping(mapData ? mapData.mapping : null);
    setOverflow(mapData ? (mapData.overflow || []) : []);
    setWeeklyData(wd);
    setCalendarConfig(cc);
    setSubDays(loadSubDays());
    setLoading(false);
  }, [selectedCourse]);

  // ── Re-read curriculum and weeklyData whenever the user returns to Phase 3
  //    Covers: switching back from Phase 1/2, refocusing the browser tab
  useEffect(() => {
    const refresh = () => {
      const cur = loadCurriculum(selectedCourse);
      if (cur) setCurriculum(cur);
      const wd = loadWeeklyData(selectedCourse);
      setWeeklyData(wd);
      const mapData = loadMapping(selectedCourse);
      if (mapData) {
        setMapping(mapData.mapping || null);
        setOverflow(mapData.overflow || []);
      }
      setSubDays(loadSubDays());
    };
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [selectedCourse]);

  // ── Also refresh whenever Phase 3 becomes the active tab
  useEffect(() => {
    if (!isActive) return;
    const cur = loadCurriculum(selectedCourse);
    if (cur) setCurriculum(cur);
    const wd = loadWeeklyData(selectedCourse);
    setWeeklyData(wd);
    const mapData = loadMapping(selectedCourse);
    if (mapData) {
      setMapping(mapData.mapping || null);
      setOverflow(mapData.overflow || []);
    }
    setSubDays(loadSubDays());
  }, [isActive, selectedCourse]);

  // ── Select course — notify App so Phase 2 stays in sync
  const selectCourse = (id) => {
    setSelectedCourse(id);
    setContextMenu(null);
    if (onCourseChange) onCourseChange(id);
  };

  // ── Apply mapping changes
  const applyMapping = (newMap, newOvfl) => {
    setMapping(newMap);
    setOverflow(newOvfl);
    saveMapping(selectedCourse, { mapping: newMap, overflow: newOvfl });
  };

  // ── Calendar setup save — generates fresh mappings for all courses
  const handleSaveCalendarConfig = async (config) => {
    setCalendarConfig(config);
    saveCalendarConfig(config);
    setShowSetup(false);

    // Notify App so Phase 2 re-reads immediately
    if (onCalendarSaved) onCalendarSaved();

    // Jump calendar view to semester start month
    const start = parseDate(config.startDate);
    setViewYear(start.getFullYear());
    setViewMonth(start.getMonth());

    // Auto-generate only if no mapping exists yet (fresh setup)
    const existingMap = loadMapping(selectedCourse);
    const hasMapping = existingMap?.mapping && Object.keys(existingMap.mapping).length > 0;
    if (!hasMapping) {
      await handleGenerateSchedule(config);
    }
  };

  // ── Explicit "Generate Full Schedule" — overwrites all mappings for all courses
  const handleGenerateSchedule = async (configOverride) => {
    const cfg = configOverride || calendarConfig;
    if (!cfg) return;
    const sd = getSchoolDays(cfg.startDate, cfg.endDate, cfg.nonInstructional);

    let currentMapping = null;
    let currentOverflow = [];
    for (const p of PATHWAYS) {
      for (const c of p.courses) {
        const cur = loadCurriculum(c.id) || { units: [] };
        const { mapping: m, overflow: o } = generateMapping(cur.units || [], sd);
        saveMapping(c.id, { mapping: m, overflow: o });
        if (c.id === selectedCourse) {
          currentMapping = m;
          currentOverflow = o;
        }
      }
    }
    setMapping(currentMapping);
    setOverflow(currentOverflow);
    if (onCalendarSaved) onCalendarSaved();
  };

  // ── New Year — export backup then wipe all weekly data and mappings
  const handleNewYear = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      semesterLabel: calendarConfig?.semesterLabel || "Unknown semester",
      courses: {},
    };
    for (const p of PATHWAYS) {
      for (const c of p.courses) {
        const wd = loadWeeklyData(c.id) || {};
        const mapData = loadMapping(c.id);
        const curMapping = mapData?.mapping || {};
        const cur = loadCurriculum(c.id) || { units: [] };
        const lMap = {};
        (cur.units || []).forEach(u => u.lessons.forEach(l => { lMap[l.id] = l; }));
        const entries = [];
        for (const [date, data] of Object.entries(wd)) {
          if (data?.status || data?.note) {
            const dayMeta = curMapping[date];
            entries.push({ date, lessonTitle: lMap[dayMeta?.lessonId]?.title || "Unknown", status: data.status || "planned", note: data.note || "" });
          }
        }
        exportData.courses[c.id] = entries;
      }
    }
    // Download backup
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = (calendarConfig?.semesterLabel || "semester").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    a.download = `cte-notes-backup-${label}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Wipe all weekly data and mappings
    for (const p of PATHWAYS) {
      for (const c of p.courses) {
        saveWeeklyData(c.id, {});
        saveMapping(c.id, { mapping: {}, overflow: [] });
      }
    }
    setWeeklyData({});
    setMapping(null);
    setOverflow([]);
    setShowSetup(false);
    if (onCalendarSaved) onCalendarSaved();
  };
  // ── Drop a lesson (or whole unit) from the library sidebar onto a calendar date
  const handleDropFromLibrary = (dateKey, lesson, unit) => {
    if (!calendarConfig) return;

    // Block NI days and out-of-semester
    if (niSet.has(dateKey) || !isInSemester(dateKey)) {
      setSwapError("Can't place here — that day is non-instructional or outside the semester.");
      return;
    }

    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = sdIdx[dateKey];
    if (startIdx === undefined) {
      setSwapError("Target is not a school day.");
      return;
    }

    // ── Whole unit drop — no modal, uses existing confirm behavior ─────────────
    if (!lesson && unit) {
      const lessons = unit.lessons || [];
      const unitTotalDays = lessons.reduce((s, l) => s + (l.estimatedDays || 1), 0);

      if (startIdx + unitTotalDays > schoolDays.length) {
        setSwapError(`Not enough school days remaining for the entire unit (${unitTotalDays} days needed).`);
        return;
      }

      const targetRange = schoolDays.slice(startIdx, startIdx + unitTotalDays);
      const occupied = targetRange.filter(d => mapping?.[d]);
      if (occupied.length > 0) {
        if (!window.confirm(`${occupied.length} day${occupied.length !== 1 ? "s" : ""} in this range already have lessons. Overwrite them?`)) return;
      }

      const newMapping = { ...mapping };
      const overwrittenIds = new Set(targetRange.map(d => newMapping[d]?.lessonId).filter(Boolean));
      overwrittenIds.forEach(lid => {
        Object.keys(newMapping).forEach(d => { if (newMapping[d]?.lessonId === lid) delete newMapping[d]; });
      });
      let cursor = startIdx;
      for (const l of lessons) {
        const days = l.estimatedDays || 1;
        for (let i = 0; i < days; i++) {
          if (cursor < schoolDays.length) {
            newMapping[schoolDays[cursor]] = { type: "lesson", lessonId: l.id, unitId: unit.id, dayIndex: i + 1, totalDays: days };
            cursor++;
          }
        }
      }
      applyMapping(newMapping, overflow);
      setLibraryDragLesson(null);
      return;
    }

    // ── Single lesson drop ─────────────────────────────────────────────────────
    const totalDays = lesson.estimatedDays || 1;

    // Check ALL slots the lesson would occupy, not just the first
    const targetSlots = Array.from({ length: totalDays }, (_, i) => schoolDays[startIdx + i]).filter(Boolean);
    const occupiedSlots = targetSlots.filter(d => mapping?.[d]);
    const hasOccupied = occupiedSlots.length > 0;

    // The "primary" target for the modal preview — first occupied slot's lesson, or null
    const firstOccupiedMeta = hasOccupied ? mapping[occupiedSlots[0]] : null;
    const firstOccupiedLesson = firstOccupiedMeta?.type === "lesson" ? lessonMap[firstOccupiedMeta.lessonId] : null;

    // Check actual school days available from drop point
    const daysAvailable = schoolDays.length - startIdx;
    const overflowWarning = daysAvailable < totalDays ? totalDays - daysAvailable : 0;

    // Check if this lesson is already somewhere on the calendar
    const alreadyScheduled = Object.values(mapping || {}).some(m => m?.lessonId === lesson.id);

    // All slots empty, fits, not a duplicate — place immediately, no modal
    if (!hasOccupied && overflowWarning === 0 && !alreadyScheduled) {
      _doLibraryPlace(dateKey, lesson, unit, startIdx, totalDays);
      return;
    }

    // Otherwise show the action modal
    setDragActionModal({
      draggedLesson: { lessonId: lesson.id, unitId: unit.id, totalDays, title: lesson.title },
      targetDateKey: dateKey,
      targetMeta: firstOccupiedMeta,
      targetLesson: firstOccupiedLesson,
      isLibraryDrag: true,
      overflowWarning,
      alreadyScheduled,
      occupiedCount: occupiedSlots.length,
      pendingLibraryDrag: { lesson, unit, startIdx, totalDays },
    });
  };

  // ── Actually place a library lesson (called after modal confirms) ─────────────
  const _doLibraryPlace = (dateKey, lesson, unit, startIdx, totalDays) => {
    const newMapping = { ...mapping };
    // Clear all days of any lesson being overwritten in target range
    const targetDays = Array.from({ length: totalDays }, (_, i) => schoolDays[startIdx + i]).filter(Boolean);
    const overwrittenIds = new Set(targetDays.map(d => newMapping[d]?.lessonId).filter(Boolean));
    overwrittenIds.forEach(lid => {
      Object.keys(newMapping).forEach(d => { if (newMapping[d]?.lessonId === lid) delete newMapping[d]; });
    });
    targetDays.forEach((d, i) => {
      newMapping[d] = { type: "lesson", lessonId: lesson.id, unitId: unit.id, dayIndex: i + 1, totalDays };
    });
    applyMapping(newMapping, overflow);
    setLibraryDragLesson(null);
  };

  const handleSwap = (dateA, dateB) => {
    if (!mapping || dateA === dateB) return;

    if (niSet.has(dateB) || !isInSemester(dateB)) {
      setSwapError("Can't drop here — that day is non-instructional or outside the semester.");
      return;
    }

    const metaA = mapping[dateA];
    const metaB = mapping[dateB];
    if (!metaA) return;

    const totalA = metaA.type === "lesson" ? (metaA.totalDays || 1) : 1;
    const daysA = metaA.type === "lesson"
      ? getLessonDays(mapping, metaA.lessonId).slice(0, totalA)
      : [dateA];

    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const targetIdx = sdIdx[dateB];
    if (targetIdx === undefined) { setSwapError("Target is not a school day."); return; }

    // Check room for A at the target
    for (let i = 0; i < totalA; i++) {
      const idx = targetIdx + i;
      if (idx >= schoolDays.length || niSet.has(schoolDays[idx]) || !isInSemester(schoolDays[idx])) {
        setSwapError("Not enough school days at that position for this lesson.");
        return;
      }
    }

    // Target is empty — check if lesson fits, place immediately or warn
    if (!metaB) {
      // All target days empty?
      const targetDaysForA = Array.from({ length: totalA }, (_, i) => schoolDays[targetIdx + i]);
      const allEmpty = targetDaysForA.every(d => !mapping[d] || daysA.includes(d));
      if (allEmpty) {
        // Count overflow if any
        const daysAvailable = schoolDays.length - targetIdx;
        const overflowWarning = daysAvailable < totalA ? totalA - daysAvailable : 0;
        if (overflowWarning > 0) {
          // Show modal for overflow warning
          const draggedLesson = metaA.type === "lesson" ? lessonMap[metaA.lessonId] : null;
          setDragActionModal({
            draggedLesson: { lessonId: metaA.lessonId, unitId: metaA.unitId, totalDays: totalA, title: draggedLesson?.title || "Lesson" },
            targetDateKey: dateB,
            targetMeta: null,
            targetLesson: null,
            isLibraryDrag: false,
            overflowWarning,
            pendingDragSource: { dateA, dateB, metaA, daysA, totalA, targetIdx },
          });
          return;
        }
        // Fits cleanly — move immediately
        _doCalendarMove(dateA, dateB, metaA, daysA, totalA, targetIdx);
        return;
      }
    }

    // Target is occupied — show action modal
    const draggedLesson = metaA.type === "lesson" ? lessonMap[metaA.lessonId] : null;
    const targetLesson = metaB?.type === "lesson" ? lessonMap[metaB.lessonId] : null;
    const totalB = metaB?.type === "lesson" ? (metaB.totalDays || 1) : 1;

    // Compute overflow if insert is chosen
    const insertOverflow = _computeInsertOverflow(dateB, totalA);

    setDragActionModal({
      draggedLesson: { lessonId: metaA.lessonId, unitId: metaA.unitId, totalDays: totalA, title: draggedLesson?.title || "Lesson" },
      targetDateKey: dateB,
      targetMeta: metaB,
      targetLesson,
      isLibraryDrag: false,
      overflowWarning: insertOverflow,
      pendingDragSource: { dateA, dateB, metaA, daysA, totalA, totalB, targetIdx },
    });
  };

  // ── Compute how many lessons get pushed to overflow if we insert N days at dateKey
  const _computeInsertOverflow = (dateKey, daysNeeded) => {
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = sdIdx[dateKey] ?? -1;
    if (startIdx < 0) return 0;
    // After inserting, everything shifts forward by daysNeeded.
    // Any lesson whose first day would land past schoolDays.length goes to overflow.
    let pushed = 0;
    const seen = new Set();
    for (let i = startIdx; i < schoolDays.length; i++) {
      const m = mapping?.[schoolDays[i]];
      if (m?.type === "lesson" && m.dayIndex === 1 && !seen.has(m.lessonId)) {
        seen.add(m.lessonId);
        const newStart = i + daysNeeded;
        if (newStart >= schoolDays.length) pushed++;
      }
    }
    return pushed;
  };

  // ── Move a calendar lesson to an empty target (no modal needed)
  const _doCalendarMove = (dateA, dateB, metaA, daysA, totalA, targetIdx) => {
    const newMapping = { ...mapping };
    // Clear source fully
    Object.keys(newMapping).forEach(d => {
      if (newMapping[d]?.lessonId === metaA.lessonId) delete newMapping[d];
    });
    // Place at target
    for (let i = 0; i < totalA; i++) {
      const idx = targetIdx + i;
      if (idx < schoolDays.length) {
        newMapping[schoolDays[idx]] = {
          type: "lesson", lessonId: metaA.lessonId, unitId: metaA.unitId,
          dayIndex: i + 1, totalDays: totalA,
        };
      }
    }
    applyMapping(newMapping, overflow);
  };

  // ── Modal action: SWAP (same-length calendar-to-calendar only)
  const _doModalSwap = () => {
    const { dateA, dateB, metaA, daysA, totalA, totalB, targetIdx } = dragActionModal.pendingDragSource;
    const metaB = mapping[dateB];
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startAIdx = sdIdx[daysA[0]];
    const startBIdx = sdIdx[metaB ? getLessonDays(mapping, metaB.lessonId)[0] : dateB];
    const newMapping = { ...mapping };
    // Clear both fully
    Object.keys(newMapping).forEach(d => {
      if (newMapping[d]?.lessonId === metaA.lessonId) delete newMapping[d];
      if (metaB?.lessonId && newMapping[d]?.lessonId === metaB.lessonId) delete newMapping[d];
    });
    // Place A at B's start
    for (let i = 0; i < totalA; i++) {
      const idx = startBIdx + i;
      if (idx < schoolDays.length) {
        newMapping[schoolDays[idx]] = { type: "lesson", lessonId: metaA.lessonId, unitId: metaA.unitId, dayIndex: i + 1, totalDays: totalA };
      }
    }
    // Place B at A's start
    if (metaB?.type === "lesson") {
      for (let i = 0; i < totalB; i++) {
        const idx = startAIdx + i;
        if (idx < schoolDays.length) {
          newMapping[schoolDays[idx]] = { type: "lesson", lessonId: metaB.lessonId, unitId: metaB.unitId, dayIndex: i + 1, totalDays: totalB };
        }
      }
    }
    applyMapping(newMapping, overflow);
    setDragActionModal(null);
  };

  // ── Modal action: INSERT (shift everything forward by only the EXTRA days needed)
  //    Counts consecutive empty school days at the drop point and only shifts
  //    the remainder, so a 2-day lesson into 1 blank day shifts by 1, not 2.
  const _doModalInsert = () => {
    const modal = dragActionModal;
    const { totalDays } = modal.draggedLesson;
    const targetDate = modal.targetDateKey;

    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const targetIdx = sdIdx[targetDate] ?? 0;

    // Count consecutive empty days starting at drop point
    let emptyRun = 0;
    for (let i = targetIdx; i < schoolDays.length && i < targetIdx + totalDays; i++) {
      if (!mapping?.[schoolDays[i]]) emptyRun++;
      else break;
    }
    // Only shift by the extra days needed beyond what's already empty
    const shiftBy = Math.max(0, totalDays - emptyRun);

    if (modal.isLibraryDrag) {
      const { lesson, unit } = modal.pendingLibraryDrag;
      let workingMapping = { ...mapping };
      let workingOverflow = [...overflow];
      if (shiftBy > 0) {
        // Find first occupied day in the target range to start the shift from
        let shiftFromDate = targetDate;
        for (let i = targetIdx; i < targetIdx + totalDays; i++) {
          if (workingMapping[schoolDays[i]]) { shiftFromDate = schoolDays[i]; break; }
        }
        const shifted = shiftFrom(workingMapping, workingOverflow, shiftFromDate, shiftBy, schoolDays);
        workingMapping = shifted.mapping;
        workingOverflow = shifted.overflow;
      }
      for (let i = 0; i < totalDays; i++) {
        const idx = targetIdx + i;
        if (idx < schoolDays.length) {
          workingMapping[schoolDays[idx]] = { type: "lesson", lessonId: lesson.id, unitId: unit.id, dayIndex: i + 1, totalDays };
        }
      }
      applyMapping(workingMapping, workingOverflow);
      setLibraryDragLesson(null);
    } else {
      const { metaA, totalA } = modal.pendingDragSource;
      // Clear source first
      let workingMapping = { ...mapping };
      let workingOverflow = [...overflow];
      Object.keys(workingMapping).forEach(d => {
        if (workingMapping[d]?.lessonId === metaA.lessonId) delete workingMapping[d];
      });
      // Recount empty run after clearing source (source days may overlap target range)
      let emptyRunAfterClear = 0;
      for (let i = targetIdx; i < schoolDays.length && i < targetIdx + totalA; i++) {
        if (!workingMapping[schoolDays[i]]) emptyRunAfterClear++;
        else break;
      }
      const shiftByAfterClear = Math.max(0, totalA - emptyRunAfterClear);
      if (shiftByAfterClear > 0) {
        let shiftFromDate = targetDate;
        for (let i = targetIdx; i < targetIdx + totalA; i++) {
          if (workingMapping[schoolDays[i]]) { shiftFromDate = schoolDays[i]; break; }
        }
        const shifted = shiftFrom(workingMapping, workingOverflow, shiftFromDate, shiftByAfterClear, schoolDays);
        workingMapping = shifted.mapping;
        workingOverflow = shifted.overflow;
      }
      for (let i = 0; i < totalA; i++) {
        const idx = targetIdx + i;
        if (idx < schoolDays.length) {
          workingMapping[schoolDays[idx]] = { type: "lesson", lessonId: metaA.lessonId, unitId: metaA.unitId, dayIndex: i + 1, totalDays: totalA };
        }
      }
      applyMapping(workingMapping, workingOverflow);
    }
    setDragActionModal(null);
  };

  // ── Modal action: OVERWRITE (clear target's days, leave empty, place dragged lesson)
  const _doModalOverwrite = () => {
    const modal = dragActionModal;
    const { totalDays } = modal.draggedLesson;
    const targetDate = modal.targetDateKey;
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const targetIdx = sdIdx[targetDate];

    const newMapping = { ...mapping };

    if (modal.isLibraryDrag) {
      const { lesson, unit } = modal.pendingLibraryDrag;
      // Clear all days of any lesson at target
      if (modal.targetMeta?.lessonId) {
        Object.keys(newMapping).forEach(d => {
          if (newMapping[d]?.lessonId === modal.targetMeta.lessonId) delete newMapping[d];
        });
      } else if (modal.targetMeta) {
        delete newMapping[targetDate];
      }
      // Place lesson
      for (let i = 0; i < totalDays; i++) {
        const idx = targetIdx + i;
        if (idx < schoolDays.length) {
          newMapping[schoolDays[idx]] = { type: "lesson", lessonId: lesson.id, unitId: unit.id, dayIndex: i + 1, totalDays };
        }
      }
      setLibraryDragLesson(null);
    } else {
      const { metaA, daysA, totalA } = modal.pendingDragSource;
      // Clear source
      Object.keys(newMapping).forEach(d => {
        if (newMapping[d]?.lessonId === metaA.lessonId) delete newMapping[d];
      });
      // Clear target lesson fully
      if (modal.targetMeta?.lessonId) {
        Object.keys(newMapping).forEach(d => {
          if (newMapping[d]?.lessonId === modal.targetMeta.lessonId) delete newMapping[d];
        });
      } else if (modal.targetMeta) {
        delete newMapping[targetDate];
      }
      // Place A at target
      for (let i = 0; i < totalA; i++) {
        const idx = targetIdx + i;
        if (idx < schoolDays.length) {
          newMapping[schoolDays[idx]] = { type: "lesson", lessonId: metaA.lessonId, unitId: metaA.unitId, dayIndex: i + 1, totalDays: totalA };
        }
      }
    }
    applyMapping(newMapping, overflow);
    setDragActionModal(null);
  };

  // ── Add/Remove day handlers
  const handleAddDay = (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const days = getLessonDays(mapping, meta.lessonId);
    const lastDay = days[days.length - 1];
    const afterLast = addDays(lastDay, 1);
    const updated = { ...mapping };
    days.forEach(d => { updated[d] = { ...updated[d], totalDays: meta.totalDays + 1 }; });
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(updated, overflow, afterLast, 1, schoolDays);
    const sdIdx = {}; schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const newDayIdx = (sdIdx[lastDay] ?? -1) + 1;
    if (newDayIdx > 0 && newDayIdx < schoolDays.length) {
      shifted[schoolDays[newDayIdx]] = { type: "lesson", lessonId: meta.lessonId, unitId: meta.unitId, dayIndex: meta.totalDays + 1, totalDays: meta.totalDays + 1 };
    }
    applyMapping(shifted, newOvfl);
  };

  const handleRemoveDay = (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const days = getLessonDays(mapping, meta.lessonId);
    const newMap = { ...mapping };
    if (days.length === 1) {
      // Single day lesson — just delete it, leave the day empty
      delete newMap[dateKey];
      applyMapping(newMap, overflow);
    } else {
      // Multi-day lesson — remove the last day, shrink totalDays by 1
      const lastDay = days[days.length - 1];
      delete newMap[lastDay];
      days.slice(0, -1).forEach(d => { newMap[d] = { ...newMap[d], totalDays: meta.totalDays - 1 }; });
      applyMapping(newMap, overflow);
    }
  };

  const handleInsertBlock = (dateKey, label = "Event") => {
    if (!mapping) return;
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(mapping, overflow, dateKey, 1, schoolDays);
    shifted[dateKey] = { type: "block", label };
    applyMapping(shifted, newOvfl);
  };

  // ── Insert a blank empty day at dateKey — shifts everything forward 1
  const handleInsertBlankDay = (dateKey) => {
    if (!mapping) return;
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(mapping, overflow, dateKey, 1, schoolDays);
    // Target day is now empty (shiftFrom moved what was there forward)
    delete shifted[dateKey];
    applyMapping(shifted, newOvfl);
  };

  // ── Remove this day and pull everything behind it forward 1 to close the gap
  const handleRemoveDayPull = (dateKey) => {
    if (!mapping) return;
    const newMap = { ...mapping };
    delete newMap[dateKey];
    // Pull: shift everything from the next school day backward by 1
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = (sdIdx[dateKey] ?? -1) + 1;
    if (startIdx > 0 && startIdx < schoolDays.length) {
      const { mapping: pulled, overflow: newOvfl } = shiftFrom(newMap, overflow, schoolDays[startIdx], -1, schoolDays);
      applyMapping(pulled, newOvfl);
    } else {
      applyMapping(newMap, overflow);
    }
  };

  // ── Delete the entire lesson at this date — clears only this instance's days, no cascade
  const handleDeleteLesson = (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const lesson = lessonMap[meta.lessonId];
    const title = lesson?.title || "this lesson";
    const dayCount = meta.totalDays || 1;
    // Use inline modal instead of window.confirm — browser blocks synchronous
    // dialogs when called from right-click / drag event context in some browsers
    setDeleteConfirm({ dateKey, title, dayCount });
  };

  const _doDeleteLesson = (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const dayCount = meta.totalDays || 1;
    const instanceDays = getLessonDays(mapping, meta.lessonId).slice(0, dayCount);
    const newMap = { ...mapping };
    instanceDays.forEach(d => { delete newMap[d]; });
    applyMapping(newMap, overflow);
    setDeleteConfirm(null);
  };

  const handleRemoveBlock = (dateKey) => {
    if (!mapping) return;
    const newMap = { ...mapping };
    delete newMap[dateKey];
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(newMap, overflow, addDays(dateKey, 1), -1, schoolDays);
    applyMapping(shifted, newOvfl);
  };

  const handleEditBlock = (dateKey, newLabel) => {
    if (!mapping) return;
    applyMapping({ ...mapping, [dateKey]: { ...mapping[dateKey], label: newLabel } }, overflow);
  };

  const handleDuplicate = (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const days = getLessonDays(mapping, meta.lessonId);
    const lastDay = days[days.length - 1];
    const afterLast = addDays(lastDay, 1);
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(mapping, overflow, afterLast, meta.totalDays, schoolDays);
    const sdIdx = {}; schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = (sdIdx[lastDay] ?? -1) + 1;
    for (let i = 0; i < meta.totalDays; i++) {
      const ni = startIdx + i;
      if (ni < schoolDays.length) {
        shifted[schoolDays[ni]] = { type: "lesson", lessonId: meta.lessonId, unitId: meta.unitId, dayIndex: i + 1, totalDays: meta.totalDays };
      }
    }
    applyMapping(shifted, newOvfl);
  };

  // ── Move a lesson (and all its days) to a target date
  //    - Clears source dates (leaves empty)
  //    - If target date is mid-lesson, shifts entire target lesson forward first
  //    - Multi-day lessons move together
  //    - Overflow used if lessons get pushed past end of semester
  const handleMoveToDate = (fromDateKey, toDateKey) => {
    if (!mapping || !calendarConfig) return;

    // Block non-instructional or out-of-semester target
    if (niSet.has(toDateKey) || !isInSemester(toDateKey)) {
      setSwapError("Can't move here — that day is non-instructional or outside the semester.");
      return;
    }

    const fromMeta = mapping[fromDateKey];
    if (!fromMeta || fromMeta.type !== "lesson") return;

    // Get all days of the lesson being moved
    const sourceDays = getLessonDays(mapping, fromMeta.lessonId);
    const totalDays  = fromMeta.totalDays || 1;

    // Build index of school days
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });

    const targetIdx = sdIdx[toDateKey];
    if (targetIdx === undefined) {
      setSwapError("Target date is not a school day.");
      return;
    }

    // Check if target date is inside another lesson — if so shift that lesson forward first
    let workingMapping = { ...mapping };
    let workingOverflow = [...overflow];
    const targetMeta = workingMapping[toDateKey];

    if (targetMeta?.type === "lesson") {
      // Get the first day of the target lesson
      const targetLessonDays = getLessonDays(workingMapping, targetMeta.lessonId);
      const firstDayOfTargetLesson = targetLessonDays[0];
      // Shift everything from the first day of the target lesson forward by totalDays
      const shifted = shiftFrom(workingMapping, workingOverflow, firstDayOfTargetLesson, totalDays, schoolDays);
      workingMapping  = shifted.mapping;
      workingOverflow = shifted.overflow;
    } else if (targetMeta?.type === "block") {
      // Shift from target forward
      const shifted = shiftFrom(workingMapping, workingOverflow, toDateKey, totalDays, schoolDays);
      workingMapping  = shifted.mapping;
      workingOverflow = shifted.overflow;
    }

    // Clear the source days
    sourceDays.forEach(d => { delete workingMapping[d]; });

    // Place the lesson at the target date (and subsequent school days for multi-day)
    for (let i = 0; i < totalDays; i++) {
      const idx = targetIdx + i;
      if (idx < schoolDays.length) {
        workingMapping[schoolDays[idx]] = {
          type:      "lesson",
          lessonId:  fromMeta.lessonId,
          unitId:    fromMeta.unitId,
          dayIndex:  i + 1,
          totalDays,
        };
      } else {
        // Pushed off the end — goes to overflow
        if (i === 0) {
          workingOverflow.push({ lessonId: fromMeta.lessonId, unitId: fromMeta.unitId, daysNeeded: totalDays });
        }
        break;
      }
    }

    applyMapping(workingMapping, workingOverflow);
  };

  // ── Place an overflow lesson onto a calendar day
  //    Inserts before whatever is on that day, shifting everything forward
  const handlePlaceOverflow = (dateKey, ovItem) => {
    if (!mapping || !calendarConfig) return;

    // Reject non-instructional days and days outside the semester
    if (niSet.has(dateKey) || !isInSemester(dateKey)) {
      setSwapError("Can't place here — that day is non-instructional or outside the semester.");
      return;
    }

    const daysNeeded = ovItem.daysNeeded || 1;

    // Check enough school days remain from this point
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = sdIdx[dateKey];
    if (startIdx === undefined) {
      setSwapError("Can't place here — day is not a school day.");
      return;
    }
    const daysAvailable = schoolDays.length - startIdx;
    if (daysAvailable < daysNeeded) {
      setSwapError(`Not enough days left — need ${daysNeeded}, only ${daysAvailable} remain.`);
      return;
    }

    // Shift everything from dateKey forward by daysNeeded
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(mapping, overflow, dateKey, daysNeeded, schoolDays);

    // Place the lesson
    for (let i = 0; i < daysNeeded; i++) {
      const idx = startIdx + i;
      if (idx < schoolDays.length) {
        shifted[schoolDays[idx]] = {
          type: "lesson",
          lessonId: ovItem.lessonId,
          unitId: ovItem.unitId,
          dayIndex: i + 1,
          totalDays: daysNeeded,
        };
      }
    }

    // Remove from overflow
    const finalOverflow = newOvfl.filter(o => o.lessonId !== ovItem.lessonId);
    applyMapping(shifted, finalOverflow);
  };

  // ── Append overflow lesson to end of semester
  const handleAppendOverflow = (ovIndex) => {
    if (!mapping || !calendarConfig) return;
    const ov = overflow[ovIndex];
    if (!ov) return;
    const daysNeeded = ov.daysNeeded || 1;
    // Find the last mapped school day
    const mappedDays = Object.keys(mapping)
      .filter(d => mapping[d]?.type === "lesson" || mapping[d]?.type === "block")
      .sort();
    const lastMapped = mappedDays[mappedDays.length - 1];
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = lastMapped ? (sdIdx[lastMapped] ?? -1) + 1 : 0;
    const daysAvailable = schoolDays.length - startIdx;
    if (daysAvailable < daysNeeded) {
      setSwapError(`Not enough days left — need ${daysNeeded}, only ${daysAvailable} remain.`);
      return;
    }
    const newMap = { ...mapping };
    for (let i = 0; i < daysNeeded; i++) {
      const idx = startIdx + i;
      if (idx < schoolDays.length) {
        newMap[schoolDays[idx]] = {
          type: "lesson",
          lessonId: ov.lessonId,
          unitId: ov.unitId,
          dayIndex: i + 1,
          totalDays: daysNeeded,
        };
      }
    }
    const newOverflow = overflow.filter((_, i) => i !== ovIndex);
    applyMapping(newMap, newOverflow);
  };

  // ── Skip overflow lesson for this semester (stays in master curriculum)
  const handleSkipOverflow = (ovIndex) => {
    const ov = overflow[ovIndex];
    if (!ov) return;
    const lesson = lessonMap[ov.lessonId];
    if (!window.confirm(`Skip "${lesson?.title || "this lesson"}" for the rest of this semester? It stays in your master curriculum and will reappear when you regenerate.`)) return;
    applyMapping(mapping, overflow.filter((_, i) => i !== ovIndex));
  };

  // ── Sub day handling — global across all courses for a given date
  const handleMarkSubDay = (dateKey, note) => {
    const existing = subDays[dateKey] || {};
    const updated = { ...subDays, [dateKey]: { ...existing, subNote: note } };
    setSubDays(updated);
    saveSubDays(updated);
  };

  const handleUnmarkSubDay = (dateKey) => {
    const updated = { ...subDays };
    delete updated[dateKey];
    setSubDays(updated);
    saveSubDays(updated);
  };

  const handleEditSubNote = (dateKey, note) => {
    const existing = subDays[dateKey] || {};
    const updated = { ...subDays, [dateKey]: { ...existing, subNote: note } };
    setSubDays(updated);
    saveSubDays(updated);
  };

  // ── Context menu handler
  const openContextMenu = (e, dateKey) => {
    e.preventDefault();
    const dayData = mapping?.[dateKey];
    if (!dayData) {
      if (subDays[dateKey]) {
        setContextMenu({ type: "sub", dateKey, x: e.clientX, y: e.clientY });
      }
      return;
    }
    if (dayData.type === "block") {
      setContextMenu({ type: "block", dateKey, x: e.clientX, y: e.clientY });
    } else if (dayData.type === "lesson") {
      setContextMenu({ type: "lesson", dateKey, x: e.clientX, y: e.clientY });
    }
  };

  // Allow right-click on sub-day (even if also a lesson)
  const openContextMenuFull = (e, dateKey) => {
    e.preventDefault();
    setPopup(null);
    const dayData = mapping?.[dateKey];
    if (dayData?.type === "block") {
      setContextMenu({ type: "block", dateKey, x: e.clientX, y: e.clientY });
    } else if (dayData?.type === "lesson") {
      setContextMenu({ type: "lesson", dateKey, x: e.clientX, y: e.clientY });
    } else if (subDays[dateKey]) {
      setContextMenu({ type: "sub", dateKey, x: e.clientX, y: e.clientY });
    } else if (isInSemester(dateKey) && !niSet.has(dateKey)) {
      // Blank instructional day — offer pull-forward and insert block
      setContextMenu({ type: "empty", dateKey, x: e.clientX, y: e.clientY });
    }
  };

  // ── Day click — toggle popup (only for lessons and blocks)
  const handleDayClick = (dateKey) => {
    const dayData = mapping?.[dateKey];
    if (!dayData) return; // nothing to show for empty days
    setPopup(p => p?.dateKey === dateKey ? null : { dateKey });
  };

  // ── Month navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const goToToday = () => {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
  };

  // ── Click outside context menu
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ── Grid
  const weeks = buildMonthGrid(viewYear, viewMonth);
  const hasCurriculum = (curriculum?.units || []).some(u => u.lessons?.length > 0);

  // The CalendarSetup modal is always rendered at the top level so its
  // fixed-position backdrop never gets clipped by a parent stacking context.
  const calendarSetupModal = showSetup && (
    <CalendarSetup
      config={calendarConfig}
      onSave={handleSaveCalendarConfig}
      onGenerate={handleGenerateSchedule}
      onClose={() => setShowSetup(false)}
      onNewYear={handleNewYear}
      pathwayColor={pathwayColor}
    />
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: D.bg0, color: D.text2, fontSize: 14 }}>
        Loading monthly calendar...
      </div>
    );
  }

  // ── No config
  if (!calendarConfig) {
    return (
      <div style={{ minHeight: "100vh", background: D.bg0 }}>
        {calendarSetupModal}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: D.text0, marginBottom: 8 }}>No Calendar Set Up</div>
            <div style={{ fontSize: 14, color: D.text2, lineHeight: 1.6, marginBottom: 20 }}>
              Configure your semester dates and non-instructional days to get started.
            </div>
            <button onClick={() => setShowSetup(true)} style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor, fontWeight: 600, padding: "10px 22px", fontSize: 14 }}>
              <Settings size={14} /> Setup Calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── No mapping for this course
  if (!mapping || Object.keys(mapping).length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: D.bg0 }}>
        {calendarSetupModal}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: D.text0, marginBottom: 8 }}>No Schedule Generated</div>
            <div style={{ fontSize: 14, color: D.text2, lineHeight: 1.6, marginBottom: 20 }}>
              {hasCurriculum
                ? `${course?.name} has a curriculum but no schedule yet.`
                : `${course?.name} has no curriculum yet — build it in Phase 1 first.`}
            </div>
            {hasCurriculum && (
              <button
                onClick={() => {
                  const sd = getSchoolDays(calendarConfig.startDate, calendarConfig.endDate, calendarConfig.nonInstructional);
                  const { mapping: m, overflow: o } = generateMapping(curriculum.units, sd);
                  saveMapping(selectedCourse, { mapping: m, overflow: o });
                  setMapping(m);
                  setOverflow(o);
                }}
                style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor, fontWeight: 600, padding: "10px 22px", fontSize: 14, marginBottom: 12 }}
              >
                Generate Schedule
              </button>
            )}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowSetup(true)} style={{ ...btnStyle, fontSize: 12, padding: "6px 14px" }}>
                <Settings size={12} /> {calendarConfig ? "Edit Calendar" : "Setup Calendar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stats for the visible month
  const daysInMonth = weeks.flat().filter(d => parseDate(d).getMonth() === viewMonth);
  const instructionalInMonth = daysInMonth.filter(d => isInSemester(d) && !niSet.has(d));
  const taughtCount = instructionalInMonth.filter(d => weeklyData[d]?.status === "taught").length;
  const lessonCount = instructionalInMonth.filter(d => mapping?.[d]?.type === "lesson").length;

  return (
    <div style={{ fontFamily: "inherit", background: D.bg0, minHeight: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Calendar Setup Modal */}
      {calendarSetupModal}

      {/* ── Context menus */}
      {contextMenu?.type === "lesson" && (
        <LessonContextMenu
          x={contextMenu.x} y={contextMenu.y}
          dateKey={contextMenu.dateKey}
          dayMeta={mapping?.[contextMenu.dateKey]}
          isSubDay={!!subDays[contextMenu.dateKey]}
          onAddDay={handleAddDay}
          onRemoveDay={handleRemoveDay}
          onInsertBlankDay={handleInsertBlankDay}
          onRemoveDayPull={handleRemoveDayPull}
          onDeleteLesson={handleDeleteLesson}
          onDuplicate={handleDuplicate}
          onInsertBlock={handleInsertBlock}
          onMoveToDate={handleMoveToDate}
          onMarkSubDay={handleMarkSubDay}
          onUnmarkSubDay={handleUnmarkSubDay}
          onGoToWeek={onGoToWeek}
          onGoToLesson={onGoToLesson ? (lessonId) => onGoToLesson(selectedCourse, lessonId) : null}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu?.type === "block" && (
        <BlockContextMenu
          x={contextMenu.x} y={contextMenu.y}
          dateKey={contextMenu.dateKey}
          currentLabel={mapping?.[contextMenu.dateKey]?.label}
          onRemoveBlock={handleRemoveBlock}
          onEditBlock={handleEditBlock}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu?.type === "sub" && (
        <SubDayContextMenu
          x={contextMenu.x} y={contextMenu.y}
          dateKey={contextMenu.dateKey}
          currentNote={subDays[contextMenu.dateKey]?.subNote}
          onUnmark={handleUnmarkSubDay}
          onEditNote={handleEditSubNote}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu?.type === "empty" && (
        <EmptyDayContextMenu
          x={contextMenu.x} y={contextMenu.y}
          dateKey={contextMenu.dateKey}
          onInsertBlankDay={handleInsertBlankDay}
          onRemoveDayPull={handleRemoveDayPull}
          onInsertBlock={handleInsertBlock}
          onClose={() => setContextMenu(null)}
        />
      )}

      {swapError && <Toast message={swapError} onDismiss={() => setSwapError(null)} />}

      {/* ── Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(5,7,15,0.80)", backdropFilter: "blur(4px)",
        }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div style={{
            background: D.bg1, borderRadius: 14,
            border: "1.5px solid #6b1a1a",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            width: "100%", maxWidth: 400, overflow: "hidden",
          }}>
            <div style={{ background: "#2d0f0f", padding: "14px 18px 12px", borderBottom: "1px solid #6b1a1a" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171" }}>Delete Lesson</div>
              <div style={{ fontSize: 12, color: D.text2, marginTop: 2 }}>This cannot be undone</div>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 13, color: D.text1, lineHeight: 1.6, marginBottom: 16 }}>
                Remove <strong style={{ color: D.text0 }}>"{deleteConfirm.title}"</strong> from the calendar?{" "}
                {deleteConfirm.dayCount > 1 ? `All ${deleteConfirm.dayCount} days` : "This day"} will be cleared and left empty.
                <div style={{ fontSize: 12, color: D.text2, marginTop: 6 }}>
                  The lesson stays in your master curriculum — this only removes it from the schedule.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => _doDeleteLesson(deleteConfirm.dateKey)}
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "#2d0f0f", color: "#f87171", border: "1.5px solid #6b1a1a",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#3d1515"}
                  onMouseLeave={e => e.currentTarget.style.background = "#2d0f0f"}
                >
                  <Trash2 size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Delete from Calendar
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: D.bg2, color: D.text1, border: `1.5px solid ${D.border1}`,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = D.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = D.bg2}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Drag Action Modal */}
      {dragActionModal && (
        <DragActionModal
          draggedLesson={dragActionModal.draggedLesson}
          targetDateKey={dragActionModal.targetDateKey}
          targetMeta={dragActionModal.targetMeta}
          targetLesson={dragActionModal.targetLesson}
          isLibraryDrag={dragActionModal.isLibraryDrag}
          overflowWarning={dragActionModal.overflowWarning}
          alreadyScheduled={dragActionModal.alreadyScheduled}
          occupiedCount={dragActionModal.occupiedCount}
          onSwap={_doModalSwap}
          onInsert={_doModalInsert}
          onOverwrite={_doModalOverwrite}
          onCancel={() => { setDragActionModal(null); setLibraryDragLesson(null); }}
        />
      )}

      {/* ── Day popup */}
      {popup && (() => {
        const dk = popup.dateKey;
        const dayData = mapping?.[dk];
        const lesson = dayData?.type === "lesson" ? lessonMap[dayData.lessonId] : null;
        const unit = dayData?.type === "lesson" ? unitMap[dayData.unitId] : null;
        return (
          <DayPopup
            dateKey={dk}
            dayData={dayData}
            weeklyDayData={weeklyData[dk]}
            subDayData={subDays[dk]}
            lesson={lesson}
            unit={unit}
            pathwayColor={pathwayColor}
            onClose={() => setPopup(null)}
          />
        );
      })()}

      {/* ── Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: D.bg1, borderBottom: `1.5px solid ${D.border1}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 24px", flexWrap: "wrap", maxWidth: 1440, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: pathwayColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: D.text0 }}>Monthly Calendar</div>
              <div style={{ fontSize: 11, color: D.text2 }}>Phase 3 · {calendarConfig?.semesterLabel || "No semester"}</div>
            </div>
          </div>

          <div style={{ width: 1, height: 36, background: D.border1, flexShrink: 0 }} />

          {/* Course tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
            {PATHWAYS.map(p => (
              <div key={p.id} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                {p.id === "media" ? (
                  <button
                    onClick={() => selectCourse(mediaYear)}
                    style={{
                      padding: "6px 13px", borderRadius: 8, fontSize: 12,
                      fontWeight: selectedCourse === "media-a" || selectedCourse === "media-b" ? 600 : 400,
                      border: (selectedCourse === "media-a" || selectedCourse === "media-b")
                        ? `1.5px solid ${p.color}` : `1px solid ${D.border1}`,
                      background: (selectedCourse === "media-a" || selectedCourse === "media-b")
                        ? p.color + "18" : D.bg2,
                      color: (selectedCourse === "media-a" || selectedCourse === "media-b")
                        ? p.color : D.text2,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    Digital Media
                    <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>
                      {mediaYear === "media-b" ? "Yr B" : "Yr A"}
                    </span>
                  </button>
                ) : (
                  p.courses.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCourse(c.id)}
                      style={{
                        padding: "6px 13px", borderRadius: 8, fontSize: 12,
                        fontWeight: selectedCourse === c.id ? 600 : 400,
                        border: selectedCourse === c.id ? `1.5px solid ${c.color || p.color}` : `1px solid ${D.border1}`,
                        background: selectedCourse === c.id ? (c.color || p.color) + "18" : D.bg2,
                        color: selectedCourse === c.id ? (c.color || p.color) : D.text2,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                      <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>{c.grades}</span>
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>

          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={goToPrevMonth} style={{ ...iconBtn, background: D.bg2, border: `1px solid ${D.border1}` }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: D.text0, minWidth: 150, textAlign: "center" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button onClick={goToNextMonth} style={{ ...iconBtn, background: D.bg2, border: `1px solid ${D.border1}` }}>
              <ChevronRight size={16} />
            </button>
            <button onClick={goToToday} style={{ ...btnStyle, fontSize: 12, padding: "5px 12px" }}>
              Today
            </button>
            <div style={{ width: 1, height: 24, background: D.border1 }} />
            <button onClick={() => setShowSetup(true)} style={{ ...btnStyle, fontSize: 12, padding: "5px 12px" }}>
              <Settings size={12} /> {calendarConfig ? "Edit Calendar" : "Setup Calendar"}
            </button>
            <button
              onClick={() => setShowLibrary(s => !s)}
              style={{
                ...btnStyle, fontSize: 12, padding: "5px 12px",
                background: showLibrary ? pathwayColor + "22" : D.bg2,
                color: showLibrary ? pathwayColor : D.text1,
                borderColor: showLibrary ? pathwayColor + "60" : D.border1,
                fontWeight: showLibrary ? 600 : 400,
              }}
            >
              📚 Lesson Library
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ borderTop: `1px solid ${D.border0}`, padding: "6px 24px", display: "flex", gap: 20, alignItems: "center", maxWidth: 1440, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <span style={{ fontSize: 11, color: D.text2 }}>
            <span style={{ color: pathwayColor, fontWeight: 700 }}>{instructionalInMonth.length}</span> instructional days this month
          </span>
          <span style={{ fontSize: 11, color: D.text2 }}>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>{taughtCount}</span> taught
          </span>
          <span style={{ fontSize: 11, color: D.text2 }}>
            <span style={{ color: D.text1, fontWeight: 700 }}>{lessonCount}</span> lessons mapped
          </span>
          {overflow.length > 0 && (
            <span style={{ fontSize: 11, color: "#f97316", cursor: "pointer" }} onClick={() => setOverflowExpanded(e => !e)}>
              ⚠️ {overflow.length} lesson{overflow.length !== 1 ? "s" : ""} in overflow — see tray below
            </span>
          )}
          <span style={{ fontSize: 11, color: D.text2, marginLeft: "auto" }}>
            Click for details · Drag to move/swap · Right-click to adjust pacing
          </span>
        </div>
      </div>

      {/* ── Calendar grid + Library sidebar */}
      <div style={{ flex: 1, display: "flex", maxWidth: 1440, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

      {/* Library sidebar */}
      {showLibrary && (
        <LessonLibrarySidebar
          curriculum={curriculum}
          calendarConfig={calendarConfig}
          viewMonth={viewMonth}
          viewYear={viewYear}
          pathwayColor={pathwayColor}
          semFilter={librarySemFilter}
          onSemFilterChange={setLibrarySemFilter}
          onDragStart={(lesson, unit) => setLibraryDragLesson({ lesson, unit })}
          onDragEnd={() => setLibraryDragLesson(null)}
          onClose={() => setShowLibrary(false)}
        />
      )}

      <div style={{ flex: 1, padding: "20px 24px 40px", minWidth: 0 }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 6 }}>
          {DAY_SHORT.map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", padding: "4px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {week.map(dateKey => {
                const cellMonth = parseDate(dateKey).getMonth();
                const isThisMonth = cellMonth === viewMonth;
                const dayData = mapping?.[dateKey];
                const weeklyDayData = weeklyData[dateKey];
                const isNI = niSet.has(dateKey) || !isInSemester(dateKey);
                const lesson = dayData?.type === "lesson" ? lessonMap[dayData.lessonId] : null;
                const unit = dayData?.type === "lesson" ? unitMap[dayData.unitId] : null;
                const isToday = dateKey === today;

                return (
                  <DayCell
                    key={dateKey}
                    dateKey={dateKey}
                    dayData={dayData}
                    weeklyDayData={weeklyDayData}
                    isSubDay={!!subDays[dateKey]}
                    lesson={lesson}
                    unit={unit}
                    isToday={isToday}
                    isThisMonth={isThisMonth}
                    isNonInstructional={isNI}
                    pathwayColor={pathwayColor}
                    dragSource={dragSource}
                    dragOverflow={dragOverflow}
                    onContextMenu={openContextMenuFull}
                    onDragStart={(dk) => { if (!isNI) { setPopup(null); setDragSource(dk); } }}
                    onDrop={(dk) => {
                      if (libraryDragLesson) {
                        handleDropFromLibrary(dk, libraryDragLesson.lesson, libraryDragLesson.unit);
                      } else if (dragSource && dragSource !== dk && !isNI) {
                        handleSwap(dragSource, dk);
                      }
                      setDragSource(null);
                    }}
                    onDropOverflow={(dk) => { handlePlaceOverflow(dk, dragOverflow); setDragOverflow(null); }}
                    onDragEnd={() => { setDragSource(null); setDragOverflow(null); }}
                    onClick={!isNI ? handleDayClick : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 24, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${D.border0}` }}>
          <span style={{ fontSize: 11, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>Types:</span>
          {Object.entries(LESSON_TYPE_META).map(([key, m]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: m.accent }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: m.accent }} />
              {m.label}
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: D.border1 }} />
          <span style={{ fontSize: 11, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status:</span>
          {STATUS_ORDER.map(s => {
            const m = STATUS_META[s];
            return (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: m.color }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color }} />
                {m.label}
              </span>
            );
          })}
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: D.text2 }}>
            🧑‍🏫 Sub Day
          </span>
          {calendarConfig && (
            <span style={{ marginLeft: "auto", fontSize: 11, color: D.text2 }}>
              {calendarConfig.semesterLabel} · {calendarConfig.startDate} → {calendarConfig.endDate}
            </span>
          )}
        </div>
      </div>{/* end calendar grid column */}
      </div>{/* end calendar grid + sidebar row */}

      {/* ── Overflow tray */}
      <OverflowTray
        overflow={overflow}
        lessonMap={lessonMap}
        unitMap={unitMap}
        expanded={overflowExpanded}
        onToggle={() => setOverflowExpanded(e => !e)}
        onDragStart={(ovItem) => { setDragOverflow(ovItem); setDragSource(null); setPopup(null); }}
        onDragEnd={() => setDragOverflow(null)}
        onAppend={handleAppendOverflow}
        onSkip={handleSkipOverflow}
        pathwayColor={pathwayColor}
      />

      {/* ── Footer */}
      <div style={{ borderTop: `1px solid ${D.border0}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <span style={{ fontSize: 11, color: D.text2 }}>Phase 3 · Monthly Calendar · Auto-saved</span>
        <span style={{ fontSize: 12, color: D.text2 }}>{course?.name} · {course?.pathway?.shortName}</span>
      </div>
    </div>
  );
}
