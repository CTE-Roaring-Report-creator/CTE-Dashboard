import { useState, useEffect, useCallback, useRef } from "react";
import {
  loadWeeklyData, saveWeeklyData,
  loadCalendarConfig, saveCalendarConfig,
  loadMapping, saveMapping,
  loadSubDays, saveSubDays,
  loadPushConfig,
  loadClassroomLog, saveClassroomLog,
} from './driveStorage';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, BookOpen,
  ExternalLink, X, ChevronDown, ChevronUp, MessageSquare,
  AlertTriangle, Settings, Send, Check, Copy,
  RotateCcw, Sun, Zap, Eye, EyeOff, Plus, Trash2
} from "lucide-react";
import SubPlanModal from "./SubPlanModal";
import SubPlanPreflightModal from "./SubPlanPreflightModal";
import BellRingerPush from "./BellRingerPush";
import { generateSubPlan } from "./generateSubPlan";

// ─── CONSTANTS (mirrors Phase 1 design system) ───────────────────────────────

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

  project:         { label: "Project",       accent: "#a855f7", bg: "#1a0d3d", border: "#381a6b" },
  assessment:      { label: "Assessment",    accent: "#f97316", bg: "#2d1a0d", border: "#6b3a1a" },
};

const RESOURCE_TYPE_META = {
  "slide-deck":       { label: "Slide Deck",       icon: "📊", color: "#1a56c4" },
  "handout":          { label: "Handout",           icon: "📄", color: "#16a34a" },
  "instructions":     { label: "Instructions",      icon: "📋", color: "#7c22d4" },
  "rubric":           { label: "Rubric",            icon: "✅", color: "#ea580c" },
  "template":         { label: "Template",          icon: "📁", color: "#0891b2" },
  "external-tool":    { label: "External Tool",     icon: "🔗", color: "#dc2626" },
  "teacher-reference":{ label: "Teacher Reference", icon: "📖", color: "#854d0e" },
};

const RESOURCE_TYPE_LIST = Object.entries(RESOURCE_TYPE_META).map(([id, m]) => ({ id, ...m }));

function uid() {
  return Math.random().toString(36).slice(2, 10);
}


const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];


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

// ─── STORAGE HELPERS — now backed by Google Drive (imported above) ────────────

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function getPathwayForCourse(courseId) {
  return PATHWAYS.find(p => p.courses.some(c => c.id === courseId));
}

function getCourse(courseId) {
  for (const p of PATHWAYS) {
    const c = p.courses.find(c => c.id === courseId);
    if (c) return { ...c, pathway: p };
  }
  return null;
}

// Date helpers — all dates as YYYY-MM-DD strings
function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  // Parse as local date, not UTC
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
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return dateStr(d);
}

function todayStr() {
  return dateStr(new Date());
}

function formatMonthDay(dateString) {
  const d = parseDate(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateString) {
  const d = parseDate(dateString);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatMonthYear(dateString) {
  const d = parseDate(dateString);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isWeekend(dateString) {
  const d = parseDate(dateString);
  return d.getDay() === 0 || d.getDay() === 6;
}

// ─── CLASSROOM POST HELPERS ──────────────────────────────────────────────────

function getFridayOf(mondayStr) {
  return addDays(mondayStr, 4);
}

function parseDriveFileId(url) {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isDriveUrl(url) {
  return !!(url && (url.includes("drive.google.com") || url.includes("docs.google.com")));
}

const CLASSROOM_TYPE = {
  instruction: "material",
  classwork:   "assignment",
  project:     "assignment",
  assessment:  "assignment",
};

function getWeekDates(mondayStr) {
  return DAY_NAMES.map((_, i) => addDays(mondayStr, i));
}

// Generate all school days between start and end, excluding weekends + non-instructional days
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

// ─── MAPPING UTILITIES ───────────────────────────────────────────────────────

// Auto-map lessons to school days, returns { mapping, overflow }
// mapping: dateStr -> { type:"lesson"|"block", lessonId?, unitId?, dayIndex?, totalDays?, label? }
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

// Get all school days for a lesson (sorted)
function getLessonDays(mapping, lessonId) {
  return Object.entries(mapping)
    .filter(([, m]) => m.type === "lesson" && m.lessonId === lessonId)
    .sort((a, b) => a[0] < b[0] ? -1 : 1)
    .map(([d]) => d);
}

// Shift all entries on or after fromDate by n positions in schoolDays array
// n can be negative (shift back). Returns { mapping, overflow }
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
    // if newIdx < 0 we just drop it (shouldn't happen in normal use)
  }
  return { mapping: newMapping, overflow: newOverflow };
}

// Swap two lessons. Returns { mapping, error? }
// Handles: lesson<->lesson, lesson<->block
// Warns if multi-day lessons have different lengths
function swapDays(mapping, dateA, dateB) {
  const metaA = mapping[dateA];
  const metaB = mapping[dateB];
  if (!metaA && !metaB) return { mapping, error: "Nothing to swap." };

  // Get all days for each item
  const daysA = metaA?.type === "lesson" ? getLessonDays(mapping, metaA.lessonId) : metaA ? [dateA] : [dateA];
  const daysB = metaB?.type === "lesson" ? getLessonDays(mapping, metaB.lessonId) : metaB ? [dateB] : [dateB];

  // Check length match for multi-day lessons
  if (daysA.length > 1 || daysB.length > 1) {
    if (daysA.length !== daysB.length) {
      return { mapping, error: `Can't swap: "${metaA?.lessonId ? "Lesson A" : "Block"}" is ${daysA.length} day${daysA.length!==1?"s":""} and "${metaB?.lessonId ? "Lesson B" : "Block"}" is ${daysB.length} day${daysB.length!==1?"s":""}. Shorten or extend one first.` };
    }
  }

  // Perform swap day-by-day
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

// Get bell ringer for a specific day of a lesson (1-indexed)
// Handles migration from legacy single bellRinger string
function getBellRinger(lesson, dayIndex) {
  if (!lesson) return "";
  if (Array.isArray(lesson.bellRingers)) {
    return lesson.bellRingers[(dayIndex || 1) - 1] || "";
  }
  // Legacy: single string, only show on day 1
  if (typeof lesson.bellRinger === "string" && lesson.bellRinger) {
    return dayIndex === 1 ? lesson.bellRinger : "";
  }
  return "";
}

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────

function TypeBadge({ type, small }) {
  const m = LESSON_TYPE_META[type] || LESSON_TYPE_META.instruction;
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: "0.05em",
      padding: small ? "2px 6px" : "3px 8px", borderRadius: 5,
      background: m.bg, color: m.accent, textTransform: "uppercase",
      border: `1px solid ${m.border}`, whiteSpace: "nowrap", flexShrink: 0,
    }}>{m.label}</span>
  );
}

function DayPill({ n, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, background: color + "22", color,
      border: `1px solid ${color}50`,
    }}>
      <Clock size={10} /> {n}d
    </span>
  );
}

function Modal({ children, onClose, wide, tall }) {
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
        position: "relative",
        display: "flex", flexDirection: "column",
        maxHeight: tall ? "calc(100vh - 80px)" : "none",
        overflow: tall ? "hidden" : "visible",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── DISTRICT CALENDAR PRESETS ───────────────────────────────────────────────

// ─── QUICK NOTE MODAL ─────────────────────────────────────────────────────────

function QuickNote({ dateStr: ds, existingNote, lesson, onSave, onClose, pathwayColor }) {
  const [note, setNote] = useState(existingNote || "");
  return (
    <Modal onClose={onClose}>
      <div style={{ padding: "16px 22px 12px", borderBottom: `1.5px solid ${D.border1}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: D.bg2 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.text0 }}>Reflection / Note</div>
          <div style={{ fontSize: 12, color: D.text2, marginTop: 2 }}>{lesson?.title} · {formatMonthDay(ds)}</div>
        </div>
        <button onClick={onClose} style={{ ...iconBtn, background: D.bg3, border: `1px solid ${D.border1}`, borderRadius: 6 }}><X size={15} /></button>
      </div>
      <div style={{ padding: "16px 22px", background: D.bg1 }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          autoFocus
          placeholder="What worked? What to adjust? Notes for next year..."
          style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontSize: 14, lineHeight: 1.6 }}
        />
      </div>
      <div style={{ padding: "12px 22px", borderTop: `1.5px solid ${D.border1}`, display: "flex", justifyContent: "flex-end", gap: 10, background: D.bg2 }}>
        <button onClick={onClose} style={btnStyle}>Cancel</button>
        <button onClick={() => onSave(note)} style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor, fontWeight: 600 }}>Save Note</button>
      </div>
    </Modal>
  );
}

// ─── DETAIL PANEL ────────────────────────────────────────────────────────────

function DetailPanel({ dateKey, lesson, unit, dayMeta, weeklyData, onClose, onNoteChange, onBellRingerChange, onResourcesChange, pathwayColor, pushConfig, classroomLog, onClassroomPosted, mondayStr }) {
  const note = weeklyData?.[dateKey]?.note || "";
  const [localNote, setLocalNote] = useState(note);
  const [noteDirty, setNoteDirty] = useState(false);
  const [lastYearData, setLastYearData] = useState(null);
  const typeMeta = LESSON_TYPE_META[lesson?.type] || LESSON_TYPE_META.instruction;

  // Bell ringer editable state
  const dayIndex = dayMeta?.dayIndex || 1;
  const currentBR = getBellRinger(lesson, dayIndex);
  const [localBR, setLocalBR] = useState(currentBR);
  const [brDirty, setBrDirty] = useState(false);

  // ── Resource editing state ────────────────────────────────────────────────
  const [localLinks, setLocalLinks] = useState(lesson?.links || []);
  const [linksDirty, setLinksDirty] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState(null); // id of link being edited inline
  const [newLink, setNewLink] = useState({ type: "slide-deck", label: "", url: "" });
  const [showAddLink, setShowAddLink] = useState(false);

  // Reset resource state when lesson changes
  useEffect(() => {
    setLocalLinks(lesson?.links || []);
    setLinksDirty(false);
    setEditingLinkId(null);
    setShowAddLink(false);
    setNewLink({ type: "slide-deck", label: "", url: "" });
  }, [lesson?.id]);

  const saveLinks = () => {
    if (onResourcesChange) {
      onResourcesChange(lesson, localLinks);
      setLinksDirty(false);
      setEditingLinkId(null);
    }
  };

  const cancelLinks = () => {
    setLocalLinks(lesson?.links || []);
    setLinksDirty(false);
    setEditingLinkId(null);
    setShowAddLink(false);
    setNewLink({ type: "slide-deck", label: "", url: "" });
  };

  const addLink = () => {
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    const isDrive = isDriveUrl(newLink.url);
    const isInstruction = lesson?.type === "instruction";
    const typeMeta = RESOURCE_TYPE_LIST.find(t => t.id === newLink.type);
    const entry = {
      id: uid(),
      type: newLink.type,
      label: newLink.label.trim(),
      url: newLink.url.trim(),
      postToClassroom: typeMeta?.id === "teacher-reference" ? false : true,
      makeACopy: (!isInstruction && isDrive && (newLink.type === "handout" || newLink.type === "template")) ? true : false,
    };
    const updated = [...localLinks, entry];
    setLocalLinks(updated);
    setLinksDirty(true);
    setNewLink({ type: "slide-deck", label: "", url: "" });
    setShowAddLink(false);
  };

  const removeLink = (id) => {
    setLocalLinks(ls => ls.filter(l => l.id !== id));
    setLinksDirty(true);
    if (editingLinkId === id) setEditingLinkId(null);
  };

  const updateLink = (id, field, value) => {
    setLocalLinks(ls => ls.map(l => l.id === id ? { ...l, [field]: value } : l));
    setLinksDirty(true);
  };

  // ── Classroom post state ──────────────────────────────────────────────────
  const isDay1 = (dayMeta?.dayIndex || 1) === 1;
  const classroomType = CLASSROOM_TYPE[lesson?.type] || "assignment";
  const isMaterial = classroomType === "material";
  const fridayStr = mondayStr ? getFridayOf(mondayStr) : "";
  const postedEntry = lesson?.id ? (classroomLog?.[lesson.id] || null) : null;

  const [postResources, setPostResources] = useState([]);
  const [dueDate, setDueDate] = useState(fridayStr);
  const [showPostPanel, setShowPostPanel] = useState(false);
  const [pushStatus, setPushStatus] = useState(null); // null | "loading" | "success" | "error"
  const [pushMessage, setPushMessage] = useState("");
  const [postUrl, setPostUrl] = useState(null);

  // Sync postResources when localLinks change (so Classroom post reflects edits)
  useEffect(() => {
    setPostResources(
      localLinks
        .filter(lk => lk.postToClassroom !== false)
        .map(lk => ({ ...lk, _include: true }))
    );
  }, [localLinks]);

  // Reset push UI state when lesson/date changes
  useEffect(() => {
    setDueDate(fridayStr);
    setPushStatus(null);
    setPushMessage("");
    setPostUrl(null);
    setShowPostPanel(false);
  }, [lesson?.id, dateKey]);

  const handlePost = async () => {
    if (!pushConfig?.scriptUrl) {
      setPushStatus("error");
      setPushMessage("No Apps Script URL configured — set it up in the Bell Ringer Push ⚙ config.");
      setShowPostPanel(true);
      return;
    }
    const classroomIds = (pushConfig.classroomIds || "").split(",").map(s => s.trim()).filter(Boolean);
    if (classroomIds.length === 0) {
      setPushStatus("error");
      setPushMessage("No Classroom course IDs configured — add them in the Bell Ringer Push ⚙ config.");
      setShowPostPanel(true);
      return;
    }

    setPushStatus("loading");
    setShowPostPanel(true);

    const attachments = postResources
      .filter(r => r._include)
      .map(r => {
        const driveId = isDriveUrl(r.url) ? parseDriveFileId(r.url) : null;
        return { label: r.label, url: r.url, driveId, makeACopy: !isMaterial && !!r.makeACopy && !!driveId, isDrive: !!driveId };
      });

    const payload = {
      action:        "postLesson",
      classroomIds,
      lessonTitle:   lesson.title,
      lessonType:    lesson.type,
      classroomType,
      objective:     lesson.objective || "",
      dueDate:       isMaterial ? null : dueDate,
      points:        isMaterial ? null : 4,
      attachments,
    };

    try {
      const res  = await fetch(pushConfig.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (_) {
        setPushStatus("error");
        setPushMessage(text.length > 0
          ? `Unexpected response: ${text.slice(0, 200)}`
          : "Empty response from Apps Script. Check Executions log.");
        return;
      }

      if (result.ok !== false) {
        setPushStatus("success");
        setPushMessage(result.message || `Posted "${lesson.title}" successfully!`);
        if (result.postUrl) setPostUrl(result.postUrl);
        const entry = { ts: new Date().toISOString(), lessonTitle: lesson.title, classroomType, dueDate: isMaterial ? null : dueDate, postUrl: result.postUrl || null };
        onClassroomPosted(lesson.id, entry);
      } else {
        setPushStatus("error");
        setPushMessage(result.message || "Post failed. Check Apps Script Executions log.");
      }
    } catch (err) {
      setPushStatus("error");
      setPushMessage(`Network error: ${err.message}`);
    }
  };

  // Reset bell ringer when lesson/day changes
  useEffect(() => {
    setLocalBR(getBellRinger(lesson, dayMeta?.dayIndex || 1));
    setBrDirty(false);
  }, [lesson?.id, dayMeta?.dayIndex]);

  const saveBellRinger = () => {
    if (onBellRingerChange) {
      onBellRingerChange(lesson, dayIndex, localBR);
      setBrDirty(false);
    }
  };

  useEffect(() => {
    if (noteDirty) {
      if (!confirm("You have an unsaved note. Discard it?")) return;
    }
    setLocalNote(weeklyData?.[dateKey]?.note || "");
    setNoteDirty(false);
  }, [dateKey]);

  const saveNote = () => { onNoteChange(dateKey, localNote); setNoteDirty(false); };

  const handleLoadLastYear = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const noteMap = {};
          for (const courseEntries of Object.values(data.courses || {})) {
            for (const entry of courseEntries) {
              if (entry.note) noteMap[entry.lessonTitle] = entry;
            }
          }
          setLastYearData({ map: noteMap, label: data.semesterLabel || "Last year" });
        } catch (_) { alert("Could not read backup file."); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const lastYearEntry = lastYearData && lesson ? lastYearData.map[lesson.title] : null;

  if (!lesson) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: D.text2, fontSize: 14, padding: 32, background: D.bg1, borderLeft: `1.5px solid ${D.border1}` }}>
        Select a day to view lesson details
      </div>
    );
  }

  return (
    <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", background: D.bg1, borderLeft: `1.5px solid ${D.border1}`, overflowY: "auto" }}>
      {/* Panel header */}
      <div style={{ padding: "14px 18px", background: D.bg2, borderBottom: `1.5px solid ${D.border1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: D.text2, marginBottom: 4 }}>{formatFullDate(dateKey)}</div>
          {dayMeta && (
            <div style={{ fontSize: 11, color: D.text2, marginBottom: 6 }}>Day {dayMeta.dayIndex} of {dayMeta.totalDays}</div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: D.text0, lineHeight: 1.3 }}>{lesson.title}</div>
          <div style={{ fontSize: 12, color: D.text2, marginTop: 3 }}>
            Unit: {unit?.title}
          </div>
        </div>
        <button onClick={onClose} style={{ ...iconBtn, marginTop: -2, flexShrink: 0 }}><X size={15} /></button>
      </div>

      {/* Posted status — shown at top when lesson has been posted */}
      {postedEntry && (
        <div style={{ padding: "8px 18px", background: "#0d2d1a", borderBottom: `1px solid #1a5433`, display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={13} color="#22c55e" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#22c55e", flex: 1 }}>
            {postedEntry.classroomType === "material" ? "Material" : "Assignment"} posted
            {" · "}{new Date(postedEntry.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          {postedEntry.postUrl && (
            <a href={postedEntry.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4d8ef0", display: "flex", flexShrink: 0 }}>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Success message from most recent push */}
      {pushStatus === "success" && !postedEntry && (
        <div style={{ padding: "8px 18px", background: "#0d2d1a", borderBottom: `1px solid #1a5433`, display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={13} color="#22c55e" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#22c55e", flex: 1 }}>{pushMessage}</span>
          {postUrl && (
            <a href={postUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4d8ef0", display: "flex", flexShrink: 0 }}>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Type */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border0}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <TypeBadge type={lesson.type} />
        <DayPill n={lesson.estimatedDays} color={pathwayColor} />
      </div>

      {/* Objective */}
      {lesson.objective && (
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border0}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Objective</div>
          <p style={{ margin: 0, fontSize: 14, color: D.text1, lineHeight: 1.6 }}>{lesson.objective}</p>
        </div>
      )}

      {/* Resources — editable */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border0}` }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>
            Resources {localLinks.length > 0 && `(${localLinks.length})`}
          </div>
          {linksDirty ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={saveLinks} style={{ ...btnStyle, fontSize: 11, padding: "3px 10px", background: pathwayColor + "22", color: pathwayColor, borderColor: pathwayColor + "50", fontWeight: 600 }}>
                Save
              </button>
              <button onClick={cancelLinks} style={{ ...btnStyle, fontSize: 11, padding: "3px 10px" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddLink(s => !s)}
              style={{ ...btnStyle, fontSize: 11, padding: "3px 10px", gap: 4 }}
              title="Add resource"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {/* Existing resources */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {localLinks.map(lk => {
            const rm = RESOURCE_TYPE_META[lk.type] || RESOURCE_TYPE_META["external-tool"];
            const isEditing = editingLinkId === lk.id;
            return (
              <div key={lk.id} style={{ borderRadius: 8, border: `1px solid ${isEditing ? D.border2 : D.border1}`, background: isEditing ? D.bg3 : D.bg2, overflow: "hidden" }}>
                {/* Row — always visible */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px" }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{rm.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: D.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lk.label}</span>
                  <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: rm.color + "18", color: rm.color, border: `1px solid ${rm.color}30`, flexShrink: 0 }}>{rm.label}</span>
                  <a href={lk.url} target="_blank" rel="noopener noreferrer" style={{ color: D.text2, display: "flex", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <ExternalLink size={11} />
                  </a>
                  <button
                    onClick={() => setEditingLinkId(isEditing ? null : lk.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: isEditing ? pathwayColor : D.text2, padding: 2, display: "flex", flexShrink: 0 }}
                    title="Edit"
                  >
                    <Settings size={11} />
                  </button>
                  <button
                    onClick={() => removeLink(lk.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 2, display: "flex", flexShrink: 0 }}
                    title="Remove"
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ padding: "8px 10px 10px", borderTop: `1px solid ${D.border1}`, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", gap: 7 }}>
                      <select
                        value={lk.type}
                        onChange={e => updateLink(lk.id, "type", e.target.value)}
                        style={{ ...inputStyle, fontSize: 12, padding: "4px 7px", flex: "0 0 auto", width: 130 }}
                      >
                        {RESOURCE_TYPE_LIST.map(t => (
                          <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                      <input
                        value={lk.label}
                        onChange={e => updateLink(lk.id, "label", e.target.value)}
                        placeholder="Label"
                        style={{ ...inputStyle, fontSize: 12, padding: "4px 7px", flex: 1 }}
                      />
                    </div>
                    <input
                      value={lk.url}
                      onChange={e => updateLink(lk.id, "url", e.target.value)}
                      placeholder="URL"
                      style={{ ...inputStyle, fontSize: 12, padding: "4px 7px" }}
                    />
                    {/* Classroom toggles */}
                    <div style={{ display: "flex", gap: 14, paddingTop: 2 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={lk.postToClassroom !== false}
                          onChange={e => updateLink(lk.id, "postToClassroom", e.target.checked)}
                          style={{ accentColor: "#1a56c4", width: 13, height: 13 }}
                        />
                        <span style={{ fontSize: 11, color: D.text2 }}>Post to Classroom</span>
                      </label>
                      {isDriveUrl(lk.url) && lesson?.type !== "instruction" && (
                        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
                          <input
                            type="checkbox"
                            checked={!!lk.makeACopy}
                            onChange={e => updateLink(lk.id, "makeACopy", e.target.checked)}
                            style={{ accentColor: "#a855f7", width: 13, height: 13 }}
                          />
                          <span style={{ fontSize: 11, color: D.text2 }}>Copy per student</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new resource form */}
        {showAddLink && (
          <div style={{ marginTop: 8, padding: "10px 10px", borderRadius: 8, border: `1px solid ${D.border2}`, background: D.bg3, display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", gap: 7 }}>
              <select
                value={newLink.type}
                onChange={e => setNewLink(l => ({ ...l, type: e.target.value }))}
                style={{ ...inputStyle, fontSize: 12, padding: "4px 7px", flex: "0 0 auto", width: 130 }}
              >
                {RESOURCE_TYPE_LIST.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
              <input
                value={newLink.label}
                onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))}
                placeholder="Label"
                style={{ ...inputStyle, fontSize: 12, padding: "4px 7px", flex: 1 }}
              />
            </div>
            <input
              value={newLink.url}
              onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))}
              placeholder="https://..."
              style={{ ...inputStyle, fontSize: 12, padding: "4px 7px" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={addLink}
                disabled={!newLink.label.trim() || !newLink.url.trim()}
                style={{ ...btnStyle, fontSize: 12, padding: "4px 12px", background: pathwayColor + "22", color: pathwayColor, borderColor: pathwayColor + "50", fontWeight: 600, opacity: (!newLink.label.trim() || !newLink.url.trim()) ? 0.5 : 1 }}
              >
                <Plus size={12} /> Add Resource
              </button>
              <button onClick={() => { setShowAddLink(false); setNewLink({ type: "slide-deck", label: "", url: "" }); }} style={{ ...btnStyle, fontSize: 12, padding: "4px 12px" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {localLinks.length === 0 && !showAddLink && (
          <div style={{ fontSize: 12, color: D.text2, fontStyle: "italic", padding: "4px 0" }}>
            No resources yet — click Add to attach links.
          </div>
        )}
      </div>

      {/* Standards */}
      {lesson.standards?.length > 0 && (
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border0}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Standards ({lesson.standards.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {lesson.standards.map(s => (
              <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: D.bg2, color: D.text2, border: `1px solid ${D.border1}` }}>{s.split("–")[0].trim()}</span>
            ))}
          </div>
        </div>
      )}

      {/* Post to Classroom — day 1 only */}
      {isDay1 && (
        <div style={{ borderBottom: `1px solid ${D.border0}` }}>
          {/* Section header — always visible */}
          <div
            onClick={() => setShowPostPanel(s => !s)}
            style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
          >
            <span style={{ fontSize: 13 }}>🏫</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>
              Post to Classroom
            </span>
            {/* Inline type badge */}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
              background: isMaterial ? "#0d1f3d" : "#1a0d3d",
              color: isMaterial ? "#4d8ef0" : "#a855f7",
              border: `1px solid ${isMaterial ? "#1a3a6b" : "#381a6b"}`,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {isMaterial ? "Material" : "Assignment"}
            </span>
            {pushStatus === "loading"
              ? <span style={{ fontSize: 11, color: D.text2 }}>Posting…</span>
              : pushStatus === "error"
              ? <AlertTriangle size={13} color="#f97316" />
              : postedEntry
              ? <Check size={13} color="#22c55e" />
              : null}
            {showPostPanel ? <ChevronUp size={13} color={D.text2} /> : <ChevronDown size={13} color={D.text2} />}
          </div>

          {/* Expanded post panel */}
          {showPostPanel && (
            <div style={{ padding: "0 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Due date — assignments only */}
              {!isMaterial && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Calendar size={13} color={D.text2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: D.text2, minWidth: 55 }}>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{ ...inputStyle, width: "auto", fontSize: 12, padding: "4px 8px" }}
                  />
                  <span style={{ fontSize: 11, color: D.text2 }}>· 4 pts</span>
                </div>
              )}

              {/* Resource checklist */}
              {postResources.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {postResources.map(r => {
                    const drive = isDriveUrl(r.url);
                    const canCopy = !isMaterial && drive;
                    return (
                      <div key={r.id} style={{
                        padding: "7px 10px", borderRadius: 7, display: "flex", alignItems: "center", gap: 8,
                        background: r._include ? D.bg3 : D.bg2,
                        border: `1px solid ${r._include ? D.border2 : D.border0}`,
                        opacity: r._include ? 1 : 0.5,
                      }}>
                        <input type="checkbox" checked={r._include}
                          onChange={() => setPostResources(rs => rs.map(x => x.id === r.id ? { ...x, _include: !x._include } : x))}
                          style={{ accentColor: pathwayColor, width: 13, height: 13, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: D.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                        {canCopy && r._include && (
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}>
                            <input type="checkbox" checked={!!r.makeACopy}
                              onChange={() => setPostResources(rs => rs.map(x => x.id === r.id ? { ...x, makeACopy: !x.makeACopy } : x))}
                              style={{ accentColor: "#a855f7", width: 12, height: 12 }} />
                            <span style={{ fontSize: 10, color: D.text2, whiteSpace: "nowrap" }}>
                              <Copy size={9} style={{ display: "inline", marginRight: 2 }} />copy
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: D.text2, fontStyle: "italic" }}>
                  No resources flagged for Classroom — enable "Post to Classroom" on resources in Phase 1.
                </div>
              )}

              {/* Error message */}
              {pushStatus === "error" && (
                <div style={{ padding: "8px 10px", borderRadius: 7, background: "#2d1a0d", border: "1px solid #6b3a1a", fontSize: 12, color: "#f97316", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ wordBreak: "break-word" }}>{pushMessage}</span>
                </div>
              )}

              {/* Post button */}
              <button
                onClick={handlePost}
                disabled={pushStatus === "loading"}
                style={{
                  ...btnStyle,
                  background: pushStatus === "loading" ? D.bg3 : pathwayColor,
                  color: "white", borderColor: pathwayColor, fontWeight: 600,
                  opacity: pushStatus === "loading" ? 0.7 : 1,
                  cursor: pushStatus === "loading" ? "not-allowed" : "pointer",
                  justifyContent: "center", display: "flex", gap: 7,
                }}
              >
                <Send size={13} />
                {pushStatus === "loading" ? "Posting…" : postedEntry ? "Re-post to Classroom" : "Post to Classroom"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bell Ringer — editable */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border0}`, background: "#0d2d1a22" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
          🔔 Bell Ringer{(lesson?.estimatedDays || 1) > 1 ? ` — Day ${dayIndex} of ${lesson?.estimatedDays}` : ""}
        </div>
        <textarea
          value={localBR}
          onChange={e => { setLocalBR(e.target.value); setBrDirty(true); }}
          placeholder="Enter bell ringer question for this day…"
          style={{
            ...inputStyle, minHeight: 72, resize: "vertical",
            fontSize: 13, lineHeight: 1.55,
            background: "#0d2d1a", borderColor: brDirty ? "#22c55e" : "#1a5433",
          }}
        />
        {brDirty && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={saveBellRinger}
              style={{ ...btnStyle, background: "#22c55e22", color: "#22c55e", borderColor: "#22c55e50", fontWeight: 600, fontSize: 12, padding: "5px 12px" }}
            >
              Save Bell Ringer
            </button>
            <button
              onClick={() => { setLocalBR(currentBR); setBrDirty(false); }}
              style={{ ...btnStyle, fontSize: 12, padding: "5px 12px" }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Master notes (from Phase 1) */}
      {lesson.notes && (
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${D.border0}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Teaching Notes</div>
          <p style={{ margin: 0, fontSize: 13, color: D.text2, lineHeight: 1.55, fontStyle: "italic" }}>{lesson.notes}</p>
        </div>
      )}

      {/* Daily reflection */}
      <div style={{ padding: "12px 18px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>Daily Reflection</div>
          {!lastYearData ? (
            <button onClick={handleLoadLastYear} style={{ fontSize: 11, color: D.text2, background: "none", border: `1px solid ${D.border1}`, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>
              📂 Last year
            </button>
          ) : (
            <button onClick={() => setLastYearData(null)} style={{ fontSize: 11, color: D.text2, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Last year entry */}
        {lastYearEntry && (
          <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "#0d1f3d", border: "1px solid #1a3a6b" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4d8ef0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              {lastYearData.label}
            </div>
            {lastYearEntry.note ? (
              <p style={{ margin: 0, fontSize: 12, color: "#7aabf0", lineHeight: 1.55, fontStyle: "italic" }}>{lastYearEntry.note}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#3a5a80", fontStyle: "italic" }}>No note from last year</p>
            )}
          </div>
        )}
        {lastYearData && !lastYearEntry && (
          <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: 6, background: D.bg2, fontSize: 11, color: D.text2, fontStyle: "italic" }}>
            No entry for this lesson in last year's backup
          </div>
        )}

        <textarea
          value={localNote}
          onChange={e => { setLocalNote(e.target.value); setNoteDirty(true); }}
          placeholder="What worked? Notes for next time..."
          style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontSize: 13, lineHeight: 1.55 }}
        />
        {noteDirty && (
          <button onClick={saveNote} style={{ ...btnStyle, marginTop: 8, background: pathwayColor + "22", color: pathwayColor, borderColor: pathwayColor + "50", fontWeight: 600, fontSize: 12, padding: "5px 12px" }}>
            Save Note
          </button>
        )}
      </div>
    </div>
  );
}

// ─── LESSON CARD (grid cell) ─────────────────────────────────────────────────

function LessonCard({ dateKey, lesson, unit, dayMeta, weeklyData, isSubDay, isToday, isSelected, isDragOver, pathwayColor, onSelect, onQuickNote, onContextMenu, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const hasNote = !!(weeklyData?.[dateKey]?.note);
  const typeMeta = LESSON_TYPE_META[lesson?.type] || LESSON_TYPE_META.instruction;

  const cardBg = isDragOver ? pathwayColor + "18"
    : isSubDay ? "#2d2000"
    : isSelected ? D.bg2
    : D.bg1;

  const cardBorder = isDragOver ? pathwayColor
    : isSubDay ? "#6b4a00"
    : isSelected ? pathwayColor
    : isToday ? pathwayColor + "60"
    : D.border1;

  return (
    <div
      draggable
      onClick={() => onSelect(dateKey)}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, dateKey); }}
      onDragStart={e => { e.stopPropagation(); onDragStart(dateKey); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(dateKey); }}
      onDrop={e => { e.stopPropagation(); onDrop(dateKey); }}
      onDragEnd={e => { e.stopPropagation(); onDragEnd(); }}
      style={{
        borderRadius: 10, overflow: "hidden", cursor: "grab",
        border: `1.5px solid ${cardBorder}`,
        boxShadow: isDragOver ? `0 0 0 3px ${pathwayColor}60` : isSelected ? `0 0 0 3px ${pathwayColor}30` : isToday ? `0 0 0 2px ${pathwayColor}20` : "0 2px 8px rgba(0,0,0,0.3)",
        background: cardBg,
        transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
        display: "flex", flexDirection: "column",
        minHeight: 130, opacity: 1,
      }}
    >
      <div style={{ height: 3, background: isSubDay ? "#f59e0b" : typeMeta.accent, flexShrink: 0 }} />
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <TypeBadge type={lesson?.type} small />
          {dayMeta && dayMeta.totalDays > 1 && (
            <span style={{ fontSize: 10, color: D.text2 }}>{dayMeta.dayIndex}/{dayMeta.totalDays}</span>
          )}
          <div style={{ flex: 1 }} />
          {isSubDay && <span style={{ fontSize: 13, lineHeight: 1 }}>🧑‍🏫</span>}
          {hasNote && <MessageSquare size={11} color={D.text2} />}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: D.text0, lineHeight: 1.35, flex: 1 }}>
          {lesson?.title || "Unassigned"}
        </div>
        {unit && (
          <div style={{ fontSize: 11, color: D.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {unit.title}
          </div>
        )}
        {lesson?.links?.length > 0 && (
          <div style={{ fontSize: 10, color: D.text2 }}>🔗 {lesson.links.length} resource{lesson.links.length !== 1 ? "s" : ""}</div>
        )}
      </div>
      <div style={{ padding: "6px 10px 8px", borderTop: `1px solid ${isSubDay ? "#4a3010" : D.border0}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        <button
          onClick={e => { e.stopPropagation(); onQuickNote(dateKey); }}
          style={{ ...iconBtn, padding: 4, color: hasNote ? pathwayColor : D.text2, background: hasNote ? pathwayColor + "18" : "none", borderRadius: 5 }}
          title="Add reflection note"
        >
          <MessageSquare size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── BLOCKED DAY CARD ─────────────────────────────────────────────────────────

function BlockCard({ dateKey, label, isToday, isDragOver, pathwayColor, onContextMenu, onDragOver, onDrop, onDragEnd }) {
  return (
    <div
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, dateKey); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(dateKey); }}
      onDrop={e => { e.stopPropagation(); onDrop(dateKey); }}
      onDragEnd={e => { e.stopPropagation(); onDragEnd(); }}
      style={{
        borderRadius: 10, minHeight: 130, cursor: "context-menu",
        border: `1.5px solid ${isDragOver ? pathwayColor : isToday ? "#6b3a1a" : "#3a1a0a"}`,
        background: isDragOver ? pathwayColor + "18" : "#1a0a00",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, boxShadow: isDragOver ? `0 0 0 3px ${pathwayColor}40` : "none",
        transition: "border-color 0.12s, background 0.12s",
      }}
    >
      <span style={{ fontSize: 18 }}>🚫</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#f97316", textAlign: "center", padding: "0 8px" }}>{label || "Blocked"}</span>
      <span style={{ fontSize: 10, color: "#6b3a1a" }}>Right-click to edit</span>
    </div>
  );
}

// ─── EMPTY CELL ───────────────────────────────────────────────────────────────

function EmptyCell({ dateKey, isToday, isNonInstructional, isDragOver, onDragOver, onDrop, onDragEnd }) {
  return (
    <div
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (onDragOver) onDragOver(dateKey); }}
      onDrop={e => { e.stopPropagation(); if (onDrop) onDrop(dateKey); }}
      onDragEnd={e => { e.stopPropagation(); if (onDragEnd) onDragEnd(); }}
      style={{
        borderRadius: 10, minHeight: 130,
        border: `1.5px solid ${isDragOver ? "#3a4468" : isToday ? "#2a3050" : D.border0}`,
        background: isDragOver ? "#252b40" : isNonInstructional ? "#1a0a0a" : D.bg1,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: isDragOver ? 1 : 0.5,
        transition: "border-color 0.1s, background 0.1s",
      }}
    >
      <span style={{ fontSize: 11, color: D.text2 }}>
        {isNonInstructional ? "No school" : isDragOver ? "Drop to swap" : "—"}
      </span>
    </div>
  );
}

// ─── SETUP PROMPT (no calendar configured) ───────────────────────────────────

function SetupPrompt({ pathwayColor, courseName }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "64px 32px", gap: 16, textAlign: "center",
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: pathwayColor + "22", border: `2px solid ${pathwayColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Calendar size={26} color={pathwayColor} />
      </div>
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: D.text0 }}>Calendar Not Configured</h3>
        <p style={{ margin: 0, fontSize: 14, color: D.text2, maxWidth: 400, lineHeight: 1.6 }}>
          Set up your semester dates in the <strong style={{ color: D.text1 }}>Monthly Calendar (Phase 3)</strong> — open it from the pill switcher at the bottom of the screen.
        </p>
      </div>
    </div>
  );
}

// ─── NO CURRICULUM PROMPT ────────────────────────────────────────────────────

function NoCurriculumPrompt({ courseName }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "64px 32px", gap: 12, textAlign: "center",
    }}>
      <AlertTriangle size={32} color="#f59e0b" />
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text0 }}>No Curriculum Found</h3>
      <p style={{ margin: 0, fontSize: 14, color: D.text2, maxWidth: 360, lineHeight: 1.6 }}>
        No lessons found for <strong style={{ color: D.text1 }}>{courseName}</strong>. Go to Phase 1 (Master Builder) and add units and lessons first, then come back to set up the weekly view.
      </p>
    </div>
  );
}

// ─── CONTEXT MENUS ───────────────────────────────────────────────────────────

function LessonContextMenu({ x, y, dateKey, dayMeta, isSubDay, onAddDay, onRemoveDay, onDuplicate, onInsertBlock, onMarkSubDay, onClose }) {
  const isOneDay = !dayMeta || dayMeta.totalDays <= 1;
  const menuW = 260;
  const cx = Math.min(x, window.innerWidth - menuW - 8);
  const cy = Math.min(y, window.innerHeight - 320);

  const pacingItems = [
    { icon: "➕", label: "Add a day",       sub: "Extend lesson, shift rest forward",       action: () => { onAddDay(dateKey); onClose(); } },
    { icon: "➖", label: isOneDay ? "Remove from schedule" : "Remove a day", sub: isOneDay ? "Sends to overflow panel" : "Shorten lesson by 1 day", action: () => { onRemoveDay(dateKey); onClose(); } },
    { icon: "📋", label: "Duplicate lesson", sub: "Repeat after itself, shift rest forward", action: () => { onDuplicate(dateKey); onClose(); } },
    { icon: "🚫", label: "Insert blocked day", sub: "Mark event/assembly, shift rest forward", action: () => {
      const label = prompt("Label for this blocked day (e.g. Assembly, Fire Drill):", "Event");
      if (label !== null) { onInsertBlock(dateKey, label || "Event"); }
      onClose();
    }},
  ];

  const MenuItem = ({ icon, label, sub, action, accent }) => (
    <button
      onClick={action}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "9px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      onMouseEnter={e => e.currentTarget.style.background = D.bg3}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: accent || D.text0 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: D.text2, marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );

  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: "fixed", left: cx, top: cy, zIndex: 10000,
      background: D.bg2, border: `1.5px solid ${D.border1}`,
      borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
      minWidth: menuW, overflow: "hidden",
    }}>
      {/* Pacing section */}
      <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${D.border0}`, fontSize: 11, color: D.text2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Adjust Pacing
      </div>
      {pacingItems.map((item, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${D.border0}` }}>
          <MenuItem {...item} />
        </div>
      ))}

      {/* Sub Plans section */}
      <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${D.border0}`, fontSize: 11, color: D.text2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Sub Plans
      </div>
      <MenuItem
        icon="🧑‍🏫"
        label={isSubDay ? "Edit sub plan" : "Mark as sub day"}
        sub={isSubDay ? "Update instructions for the sub" : "Add sub instructions for this day"}
        accent={isSubDay ? "#f59e0b" : undefined}
        action={() => { onMarkSubDay(dateKey); onClose(); }}
      />
    </div>
  );
}

function BlockContextMenu({ x, y, dateKey, currentLabel, onRemoveBlock, onEditBlock, onClose }) {
  const menuW = 220;
  const cx = Math.min(x, window.innerWidth - menuW - 8);
  const cy = Math.min(y, window.innerHeight - 140);

  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: "fixed", left: cx, top: cy, zIndex: 10000,
      background: D.bg2, border: `1.5px solid ${D.border1}`,
      borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
      minWidth: menuW, overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${D.border0}`, fontSize: 11, color: D.text2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Blocked Day
      </div>
      {[
        { icon: "✏️", label: "Edit label", action: () => {
          const label = prompt("Edit label:", currentLabel || "Event");
          if (label !== null) onEditBlock(dateKey, label || "Event");
          onClose();
        }},
        { icon: "🗑️", label: "Remove block", sub: "Shifts everything back 1 day", action: () => { onRemoveBlock(dateKey); onClose(); }},
      ].map((item, i, arr) => (
        <button key={i} onClick={item.action} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          width: "100%", padding: "9px 12px",
          background: "none", border: "none",
          borderBottom: i < arr.length - 1 ? `1px solid ${D.border0}` : "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
          onMouseEnter={e => e.currentTarget.style.background = D.bg3}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: D.text0 }}>{item.label}</div>
            {item.sub && <div style={{ fontSize: 11, color: D.text2, marginTop: 1 }}>{item.sub}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── WEEKLY BELL RINGERS ─────────────────────────────────────────────────────

function WeeklyBellRingers({ weekDates, mapping, lessonMap, niSet, pathwayColor }) {
  // Build this week's bell ringers
  const weekBellRingers = weekDates.map(d => {
    const isNI = niSet.has(d);
    if (isNI) return { date: d, type: "ni" };
    const dayMeta = mapping?.[d];
    if (!dayMeta) return { date: d, type: "empty" };
    if (dayMeta.type === "block") return { date: d, type: "block", label: dayMeta.label };
    const lesson = lessonMap[dayMeta.lessonId];
    const bellRinger = getBellRinger(lesson, dayMeta.dayIndex || 1);
    return {
      date: d,
      type: "lesson",
      lessonTitle: lesson?.title || "Unknown",
      lessonType: lesson?.type || "instruction",
      dayIndex: dayMeta.dayIndex || 1,
      totalDays: dayMeta.totalDays || 1,
      bellRinger,
    };
  });

  const hasAny = weekBellRingers.some(d => d.type === "lesson" && d.bellRinger);

  return (
    <div style={{ marginTop: 16, borderRadius: 10, border: `1.5px solid ${D.border1}`, overflow: "hidden", background: D.bg1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${D.border0}` }}>
        <span style={{ fontSize: 15 }}>🔔</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: D.text0, flex: 1 }}>
          This Week's Bell Ringers
        </span>
        {!hasAny && (
          <span style={{ fontSize: 11, color: D.text2, fontStyle: "italic" }}>No bell ringers set — add them in Phase 1</span>
        )}
      </div>

      {/* Content — always visible */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
        {weekBellRingers.map((day, i) => {
          const typeMeta = LESSON_TYPE_META[day.lessonType] || LESSON_TYPE_META.instruction;
          const isLast = i === weekBellRingers.length - 1;
          return (
            <div key={day.date} style={{
              padding: "12px 14px",
              borderRight: isLast ? "none" : `1px solid ${D.border0}`,
              minHeight: 100,
              display: "flex", flexDirection: "column", gap: 6,
              background: day.type === "ni" || day.type === "block" ? "#1a0a00" : D.bg1,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {DAY_SHORT[i]}
              </div>
              {day.type === "ni" && (
                <span style={{ fontSize: 11, color: D.text2, fontStyle: "italic" }}>No school</span>
              )}
              {day.type === "block" && (
                <span style={{ fontSize: 11, color: "#f97316", fontStyle: "italic" }}>{day.label || "Blocked"}</span>
              )}
              {day.type === "empty" && (
                <span style={{ fontSize: 11, color: D.text2, fontStyle: "italic" }}>—</span>
              )}
              {day.type === "lesson" && (
                <>
                  <div style={{ fontSize: 11, color: typeMeta.accent, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {day.lessonTitle}
                    {day.totalDays > 1 && (
                      <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7, fontWeight: 400 }}>day {day.dayIndex}/{day.totalDays}</span>
                    )}
                  </div>
                  {day.bellRinger ? (
                    <p style={{ margin: 0, fontSize: 13, color: D.text0, lineHeight: 1.55, flex: 1 }}>
                      {day.bellRinger}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: D.text2, fontStyle: "italic", flex: 1 }}>
                      No bell ringer set
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${D.border0}`, fontSize: 11, color: D.text2 }}>
        To add or edit bell ringers, open the lesson in Phase 1 → Master Builder
      </div>
    </div>
  );
}

// ─── MAIN PHASE 2 COMPONENT ──────────────────────────────────────────────────

export default function Phase2({ isActive, calendarVersion, selectedCourse: selectedCourseProp, onCourseChange, focusedWeek, onWeekFocused, curricula: curriculaProp = {}, onCurriculaChange, driveReady }) {
  const [selectedCourse, setSelectedCourse] = useState(selectedCourseProp || "intro-tech");
  const [curricula, setCurricula] = useState(curriculaProp);
  const [weeklyDataMap, setWeeklyDataMap] = useState({});
  const [calendarConfig, setCalendarConfig] = useState(null);
  const [mappings, setMappings] = useState({});
  const [overflows, setOverflows] = useState({});
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [swapError, setSwapError] = useState(null);
  const [pushConfig, setPushConfig] = useState(null);
  const [classroomLog, setClassroomLog] = useState({});

  const [currentMonday, setCurrentMonday] = useState(getMondayOf(todayStr()));

  // ── Jump to a specific week when navigated from Phase 3
  useEffect(() => {
    if (focusedWeek) {
      setCurrentMonday(getMondayOf(focusedWeek));
      setSelectedDay(null);
      if (onWeekFocused) onWeekFocused();
    }
  }, [focusedWeek]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showSetup, setShowSetup] = useState(false); // kept for SetupPrompt redirect — modal moved to Phase 3
  const [quickNoteDay, setQuickNoteDay] = useState(null);
  const [subDayModal, setSubDayModal] = useState(null);
  const [subDays, setSubDays] = useState({});
  const [preflightOpen, setPreflightOpen] = useState(false);
  const saveTimer = useRef(null);

  // ── Always follow App's course selection — App is the single source of truth
  useEffect(() => {
    if (selectedCourseProp) {
      setSelectedCourse(selectedCourseProp);
      setSelectedDay(null);
      // Reload push config and classroom log for new course
      if (driveReady) {
        loadPushConfig(selectedCourseProp).then(cfg => { if (cfg) setPushConfig(cfg); else setPushConfig(null); });
        loadClassroomLog(selectedCourseProp).then(log => setClassroomLog(log || {}));
      }
    }
  }, [selectedCourseProp, driveReady]);

  // ── Sync curricula from prop (loaded by Phase 1 from Drive)
  useEffect(() => {
    if (curriculaProp && Object.keys(curriculaProp).length > 0) {
      setCurricula(curriculaProp);
    }
  }, [curriculaProp]);

  // ── Re-read calendarConfig, curricula and mappings when Phase 2 becomes active
  //    OR when Phase 3 signals a calendar save via calendarVersion bump
  useEffect(() => {
    async function sync() {
      const cc = await loadCalendarConfig();
      setCalendarConfig(cc);
      const newLoaded = {}, newMaps = {}, newOvfls = {};
      for (const p of PATHWAYS) {
        for (const c of p.courses) {
          // Curriculum comes from prop
          newLoaded[c.id] = curriculaProp[c.id] || curricula[c.id] || { units: [] };
          const rawMap = await loadMapping(c.id);
          if (rawMap?.mapping) {
            newMaps[c.id] = rawMap.mapping;
            newOvfls[c.id] = rawMap.overflow || [];
          } else if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
            newMaps[c.id] = rawMap;
            newOvfls[c.id] = [];
          } else {
            newMaps[c.id] = null;
            newOvfls[c.id] = [];
          }
        }
      }
      setCurricula(prev => ({ ...prev, ...newLoaded }));
      setMappings(newMaps);
      setOverflows(newOvfls);
      setSubDays(await loadSubDays());
    }
    sync();
  }, [isActive, calendarVersion]);

  // ── Dark theme injection
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = "#0f1117";
    document.body.style.color = "#e8e6e1";
    const style = document.createElement("style");
    style.id = "cte-p2-theme";
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      body { background: #0f1117 !important; color: #e8e6e1 !important; }
      input, select, textarea { background: #1e2130 !important; color: #e8e6e1 !important; border-color: #2e3350 !important; }
      input[type="date"] { color-scheme: dark; }
      input::placeholder, textarea::placeholder { color: #4a5070 !important; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #0f1117; }
      ::-webkit-scrollbar-thumb { background: #2e3350; border-radius: 3px; }
    `;
    if (!document.getElementById("cte-p2-theme")) document.head.appendChild(style);
  }, []);

  // ── Initial load
  useEffect(() => {
    async function init() {
      // selectedCourse is owned by App — do not read from settings here
      // mediaYear is derived from calendarConfig

      const loaded = {}, wdMap = {}, configs = {}, maps = {}, ovfl = {};
      for (const p of PATHWAYS) {
        for (const c of p.courses) {
          // Curriculum comes from prop (loaded by Phase 1 from Drive)
          loaded[c.id] = curriculaProp[c.id] || { units: [] };
          wdMap[c.id] = await loadWeeklyData(c.id) || {};
          const rawMap = await loadMapping(c.id);
          if (rawMap?.mapping) {
            maps[c.id] = rawMap.mapping;
            ovfl[c.id] = rawMap.overflow || [];
          } else if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
            maps[c.id] = rawMap; ovfl[c.id] = [];
          } else {
            maps[c.id] = null; ovfl[c.id] = [];
          }
        }
      }
      const sharedConfig = await loadCalendarConfig();
      setCurricula(loaded);
      setWeeklyDataMap(wdMap);
      setCalendarConfig(sharedConfig);
      setMappings(maps);
      setOverflows(ovfl);
      setSubDays(await loadSubDays());
      // Load bell ringer push config (reused for Classroom posting)
      const pCfg = await loadPushConfig(selectedCourse);
      if (pCfg) setPushConfig(pCfg);
      // Load classroom post log
      const cLog = await loadClassroomLog(selectedCourse);
      if (cLog) setClassroomLog(cLog);
      setLoading(false);
    }
    init();
  }, []);

  const pathway = getPathwayForCourse(selectedCourse);
  const pathwayColor = pathway?.color || "#1a56c4";
  const course = getCourse(selectedCourse);
  const mediaYear = calendarConfig?.mediaYear || "media-a";
  const curriculum = curricula[selectedCourse] || { units: [] };
  const units = curriculum.units || [];
  const weeklyData = weeklyDataMap[selectedCourse] || {};
  const mapping = mappings[selectedCourse] || null;
  const overflow = overflows[selectedCourse] || [];
  const schoolDays = calendarConfig
    ? getSchoolDays(calendarConfig.startDate, calendarConfig.endDate, calendarConfig.nonInstructional)
    : [];

  // Flatten all lessons for lookup
  const lessonMap = {};
  const unitMap = {};
  for (const u of units) {
    unitMap[u.id] = u;
    for (const l of u.lessons) lessonMap[l.id] = l;
  }

  const hasLessons = units.some(u => u.lessons.length > 0);
  const weekDates = getWeekDates(currentMonday);
  const today = todayStr();

  const niSet = new Set(calendarConfig?.nonInstructional || []);

  // ── Navigation
  const goToToday = () => {
    setCurrentMonday(getMondayOf(today));
    setSelectedDay(today);
  };
  const prevWeek = () => setCurrentMonday(m => addDays(m, -7));
  const nextWeek = () => setCurrentMonday(m => addDays(m, 7));

  // ── Weekly data mutations
  const updateWeeklyData = useCallback((courseId, updater) => {
    setWeeklyDataMap(prev => {
      const current = prev[courseId] || {};
      const next = updater(current);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveWeeklyData(courseId, next), 400);
      return { ...prev, [courseId]: next };
    });
  }, []);

  const handleNoteChange = (dateKey, note) => {
    updateWeeklyData(selectedCourse, wd => ({
      ...wd,
      [dateKey]: { ...wd[dateKey], note },
    }));
  };

  const handleClassroomPosted = (lessonId, entry) => {
    const newLog = { ...classroomLog, [lessonId]: entry };
    setClassroomLog(newLog);
    saveClassroomLog(selectedCourse, newLog);
  };

  const handleResourcesChange = (lesson, newLinks) => {
    try {
      const curriculum = curricula[selectedCourse];
      if (!curriculum) return;
      let updated = false;
      const newCurriculum = {
        ...curriculum,
        units: curriculum.units.map(unit => ({
          ...unit,
          lessons: unit.lessons.map(l => {
            if (l.id !== lesson.id) return l;
            updated = true;
            return { ...l, links: newLinks };
          }),
        })),
      };
      if (updated) {
        const next = { ...curricula, [selectedCourse]: newCurriculum };
        setCurricula(next);
        if (onCurriculaChange) onCurriculaChange(next);
      }
    } catch (_) {}
  };

  // ── Bell ringer inline edit — writes back to Drive via onCurriculaChange
  const handleBellRingerChange = (lesson, dayIndex, newText) => {
    try {
      const curriculum = curricula[selectedCourse];
      if (!curriculum) return;
      let updated = false;
      const newCurriculum = {
        ...curriculum,
        units: curriculum.units.map(unit => ({
          ...unit,
          lessons: unit.lessons.map(l => {
            if (l.id !== lesson.id) return l;
            const bellRingers = Array.isArray(l.bellRingers)
              ? [...l.bellRingers]
              : Array.from({ length: l.estimatedDays || 1 }, (_, i) =>
                  i === 0 && l.bellRinger ? l.bellRinger : ""
                );
            while (bellRingers.length < dayIndex) bellRingers.push("");
            bellRingers[dayIndex - 1] = newText;
            updated = true;
            const { bellRinger: _, ...rest } = l;
            return { ...rest, bellRingers };
          }),
        })),
      };
      if (updated) {
        const next = { ...curricula, [selectedCourse]: newCurriculum };
        setCurricula(next);
        if (onCurriculaChange) onCurriculaChange(next);
      }
    } catch (_) {}
  };

  // ── Sub day handlers — global across all courses for a given date
  const handleMarkSubDay = (dateKey) => {
    setSubDayModal(dateKey);
  };

  const handleSaveSubDay = (dateKey, subData) => {
    const updated = { ...subDays, [dateKey]: subData };
    setSubDays(updated);
    saveSubDays(updated);
    setSubDayModal(null);
  };

  const handleUnmarkSubDay = (dateKey) => {
    const updated = { ...subDays };
    delete updated[dateKey];
    setSubDays(updated);
    saveSubDays(updated);
    setSubDayModal(null);
  };

  // ── Export notes+statuses backup and reset for new year
  // ── Shared: persist a mapping change for current course
  const applyMapping = async (newMap, newOvfl) => {
    setMappings(prev => ({ ...prev, [selectedCourse]: newMap }));
    setOverflows(prev => ({ ...prev, [selectedCourse]: newOvfl }));
    await saveMapping(selectedCourse, { mapping: newMap, overflow: newOvfl });
  };

  // ── Regenerate all courses
  const handleRegenerate = async () => {
  if (!calendarConfig) return;
  if (!confirm("Regenerate all course schedules from master curriculum? Status and notes are kept.")) return;
  const sd = getSchoolDays(calendarConfig.startDate, calendarConfig.endDate, calendarConfig.nonInstructional);

  // Use curricula from prop/state (already loaded from Drive by Phase 1)
  const reloaded = { ...curricula };

  // Generate mappings from fresh data
  const newMaps = {}, newOvfls = {};
  for (const p of PATHWAYS) {
    for (const c of p.courses) {
      const { mapping: m, overflow: o } = generateMapping((reloaded[c.id] || { units: [] }).units, sd);
      newMaps[c.id] = m; newOvfls[c.id] = o;
      await saveMapping(c.id, { mapping: m, overflow: o });
    }
  }

  setMappings(newMaps);
  setOverflows(newOvfls);
};

  // ── Close context menu on outside click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  //    Curriculum is owned by Phase 1/App — just re-sync from prop
  //    Curriculum is owned by Phase 1/App — just re-sync from prop
  const refreshLessonContent = useCallback(() => {
    if (curriculaProp && Object.keys(curriculaProp).length > 0) {
      setCurricula(curriculaProp);
    }
  }, [curriculaProp]);

  useEffect(() => {
    const onFocus = () => refreshLessonContent();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshLessonContent]);

  // Also refresh when switching courses
  useEffect(() => {
    if (!loading) refreshLessonContent();
  }, [selectedCourse, loading]);

  // ── Add a day to a lesson (extend by 1, shift everything after)
  const handleAddDay = async (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const days = getLessonDays(mapping, meta.lessonId);
    const lastDay = days[days.length - 1];
    const afterLast = addDays(lastDay, 1);
    // Update totalDays on all lesson days
    const updated = { ...mapping };
    days.forEach(d => { updated[d] = { ...updated[d], totalDays: meta.totalDays + 1 }; });
    // Shift everything after lastDay forward 1
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(updated, overflow, afterLast, 1, schoolDays);
    // Insert the new extra day
    const sdIdx = {}; schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const newDayIdx = (sdIdx[lastDay] ?? -1) + 1;
    if (newDayIdx > 0 && newDayIdx < schoolDays.length) {
      shifted[schoolDays[newDayIdx]] = { type: "lesson", lessonId: meta.lessonId, unitId: meta.unitId, dayIndex: meta.totalDays + 1, totalDays: meta.totalDays + 1 };
    }
    await applyMapping(shifted, newOvfl);
  };

  // ── Remove a day. If lesson is 1 day, remove entirely → overflow. Otherwise shorten.
  const handleRemoveDay = async (dateKey) => {
    if (!mapping) return;
    const meta = mapping[dateKey];
    if (!meta || meta.type !== "lesson") return;
    const days = getLessonDays(mapping, meta.lessonId);
    const newMap = { ...mapping };
    if (days.length === 1) {
      // Remove entirely → overflow, shift back 1
      delete newMap[dateKey];
      const { mapping: shifted, overflow: newOvfl } = shiftFrom(newMap, overflow, addDays(dateKey, 1), -1, schoolDays);
      const withOvfl = [...newOvfl, { lessonId: meta.lessonId, unitId: meta.unitId, daysNeeded: 1 }];
      await applyMapping(shifted, withOvfl);
    } else {
      // Remove last day, shorten lesson
      const lastDay = days[days.length - 1];
      delete newMap[lastDay];
      days.slice(0, -1).forEach(d => { newMap[d] = { ...newMap[d], totalDays: meta.totalDays - 1 }; });
      const { mapping: shifted, overflow: newOvfl } = shiftFrom(newMap, overflow, addDays(lastDay, 1), -1, schoolDays);
      await applyMapping(shifted, newOvfl);
    }
  };

  // ── Insert a blocked day (event/assembly) — shifts everything from dateKey forward
  const handleInsertBlock = async (dateKey, label = "Event") => {
    if (!mapping) return;
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(mapping, overflow, dateKey, 1, schoolDays);
    shifted[dateKey] = { type: "block", label };
    await applyMapping(shifted, newOvfl);
  };

  // ── Remove a block — shifts everything after it back 1
  const handleRemoveBlock = async (dateKey) => {
    if (!mapping) return;
    const newMap = { ...mapping };
    delete newMap[dateKey];
    const { mapping: shifted, overflow: newOvfl } = shiftFrom(newMap, overflow, addDays(dateKey, 1), -1, schoolDays);
    await applyMapping(shifted, newOvfl);
  };

  // ── Edit block label
  const handleEditBlock = async (dateKey, newLabel) => {
    if (!mapping) return;
    const newMap = { ...mapping, [dateKey]: { ...mapping[dateKey], label: newLabel } };
    await applyMapping(newMap, overflow);
  };

  // ── Duplicate lesson — insert a repeat immediately after the lesson
  const handleDuplicate = async (dateKey) => {
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
    await applyMapping(shifted, newOvfl);
  };

  // ── Swap two dates (drag-drop result)
  const handleSwap = async (dateA, dateB) => {
    if (!mapping || dateA === dateB) return;
    const { mapping: newMap, error } = swapDays(mapping, dateA, dateB);
    if (error) { setSwapError(error); setTimeout(() => setSwapError(null), 4000); return; }
    await applyMapping(newMap, overflow);
  };

  // ── Schedule an overflow lesson — append to end of current mapping
  const handleScheduleOverflow = async (ovIndex) => {
    if (!mapping || !calendarConfig) return;
    const ov = overflow[ovIndex];
    if (!ov) return;
    // Find last mapped school day
    const mappedDays = Object.keys(mapping).filter(d => mapping[d]?.type === "lesson" || mapping[d]?.type === "block").sort();
    const lastMapped = mappedDays[mappedDays.length - 1];
    const sdIdx = {};
    schoolDays.forEach((d, i) => { sdIdx[d] = i; });
    const startIdx = lastMapped ? (sdIdx[lastMapped] ?? -1) + 1 : 0;
    // Check if enough days remain
    const daysNeeded = ov.daysNeeded || 1;
    const daysAvailable = schoolDays.length - startIdx;
    if (daysAvailable < daysNeeded) {
      setSwapError(`Not enough days left in semester — need ${daysNeeded}, only ${daysAvailable} remain. Shorten or remove another lesson first.`);
      setTimeout(() => setSwapError(null), 5000);
      return;
    }
    // Place the lesson
    const newMap = { ...mapping };
    for (let i = 0; i < daysNeeded; i++) {
      const idx = startIdx + i;
      if (idx < schoolDays.length) {
        newMap[schoolDays[idx]] = { type: "lesson", lessonId: ov.lessonId, unitId: ov.unitId, dayIndex: i + 1, totalDays: daysNeeded };
      }
    }
    const newOverflow = overflow.filter((_, i) => i !== ovIndex);
    await applyMapping(newMap, newOverflow);
  };

  // ── Skip an overflow lesson this semester — remove from overflow, keep in master
  const handleSkipOverflow = async (ovIndex) => {
    const ov = overflow[ovIndex];
    if (!ov) return;
    const lesson = lessonMap[ov.lessonId];
    if (!confirm(`Skip "${lesson?.title || "this lesson"}" for the rest of this semester? It stays in your master curriculum and will appear again next time you regenerate.`)) return;
    const newOverflow = overflow.filter((_, i) => i !== ovIndex);
    await applyMapping(mapping, newOverflow);
  };

  // ── Detail panel data
  const selectedDayMeta = selectedDay && mapping ? mapping[selectedDay] : null;
  const selectedLesson = selectedDayMeta ? lessonMap[selectedDayMeta.lessonId] : null;
  const selectedUnit = selectedDayMeta ? unitMap[selectedDayMeta.unitId] : null;

  // ── Week range label
  const weekEnd = addDays(currentMonday, 4);
  const weekLabel = (() => {
    const s = parseDate(currentMonday);
    const e = parseDate(weekEnd);
    const sm = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const em = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${sm} – ${em}`;
  })();

  // Pace stats
  const totalLessons = units.reduce((s, u) => s + u.lessons.length, 0);
  const totalDays = units.reduce((s, u) => s + u.lessons.reduce((ss, l) => ss + (l.estimatedDays || 1), 0), 0);
  const availableDays = calendarConfig ? getSchoolDays(calendarConfig.startDate, calendarConfig.endDate, calendarConfig.nonInstructional).length : 0;
  const paceOk = !calendarConfig || totalDays <= availableDays;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: D.bg0, color: D.text2, fontSize: 14 }}>
        Loading weekly dashboard...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "inherit", background: D.bg0, minHeight: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Modals */}
      {quickNoteDay && (
        <QuickNote
          dateStr={quickNoteDay}
          existingNote={weeklyData[quickNoteDay]?.note || ""}
          lesson={mapping?.[quickNoteDay] ? lessonMap[mapping[quickNoteDay].lessonId] : null}
          onSave={(note) => { handleNoteChange(quickNoteDay, note); setQuickNoteDay(null); }}
          onClose={() => setQuickNoteDay(null)}
          pathwayColor={pathwayColor}
        />
      )}
      {subDayModal && (
        <SubPlanModal
          dateKey={subDayModal}
          existingData={subDays[subDayModal]}
          curricula={curricula}
          mappings={mappings}
          calendarConfig={calendarConfig}
          onSave={(subData) => handleSaveSubDay(subDayModal, subData)}
          onUnmark={() => handleUnmarkSubDay(subDayModal)}
          onClose={() => setSubDayModal(null)}
          pathwayColor={pathwayColor}
        />
      )}
      {preflightOpen && (
        <SubPlanPreflightModal
          dateKeys={weekDates}
          subDays={subDays}
          curricula={curricula}
          mappings={mappings}
          calendarConfig={calendarConfig}
          pathwayColor={pathwayColor}
          onClose={() => setPreflightOpen(false)}
        />
      )}
      {contextMenu?.type === "lesson" && (
        <LessonContextMenu
          x={contextMenu.x} y={contextMenu.y}
          dateKey={contextMenu.dateKey}
          dayMeta={mapping?.[contextMenu.dateKey]}
          isSubDay={!!subDays[contextMenu.dateKey]}
          onAddDay={handleAddDay}
          onRemoveDay={handleRemoveDay}
          onDuplicate={handleDuplicate}
          onInsertBlock={handleInsertBlock}
          onMarkSubDay={handleMarkSubDay}
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

      {/* ── Sticky Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: D.bg1, borderBottom: `1.5px solid ${D.border1}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 24px", flexWrap: "wrap", maxWidth: 1440, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: pathwayColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: D.text0 }}>Weekly Dashboard</div>
              <div style={{ fontSize: 11, color: D.text2 }}>Phase 2 · {calendarConfig?.semesterLabel || "No semester set"}</div>
            </div>
          </div>

          <div style={{ width: 1, height: 36, background: D.border1, flexShrink: 0 }} />

          {/* Course tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
            {PATHWAYS.map(p => (
              <div key={p.id} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                {p.id === "media" ? (
                  <button
                    onClick={() => { setSelectedCourse(mediaYear); setSelectedDay(null); if (onCourseChange) onCourseChange(mediaYear); }}
                    style={{
                      padding: "6px 13px", borderRadius: 8, fontSize: 12,
                      fontWeight: selectedCourse === "media-a" || selectedCourse === "media-b" ? 600 : 400,
                      border: selectedCourse === "media-a" || selectedCourse === "media-b"
                        ? `1.5px solid ${p.color}` : `1px solid ${D.border1}`,
                      background: selectedCourse === "media-a" || selectedCourse === "media-b"
                        ? p.color + "18" : D.bg2,
                      color: selectedCourse === "media-a" || selectedCourse === "media-b"
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
                  p.courses.map(c => {
                    const active = selectedCourse === c.id;
                    return (
                      <button key={c.id} onClick={() => { setSelectedCourse(c.id); setSelectedDay(null); if (onCourseChange) onCourseChange(c.id); }} style={{
                        padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
                        border: active ? `1.5px solid ${p.color}` : `1px solid ${D.border1}`,
                        background: active ? p.color + "18" : D.bg2,
                        color: active ? p.color : D.text2,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}>
                        {c.name}
                        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>{c.grades}</span>

                      </button>
                    );
                  })
                )}
                {p.id !== PATHWAYS[PATHWAYS.length - 1].id && (
                  <div style={{ width: 1, background: D.border1, margin: "0 2px" }} />
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {calendarConfig && mapping && (
              <button onClick={handleRegenerate} style={{ ...btnStyle, fontSize: 12, padding: "6px 12px" }} title="Regenerate schedule from master curriculum">
                <RotateCcw size={12} /> Regen
              </button>
            )}
            {weekDates.some(d => subDays[d]) && (
              <button
                onClick={() => setPreflightOpen(true)}
                style={{ ...btnStyle, fontSize: 12, padding: "6px 12px", background: "#2d2000", color: "#f59e0b", borderColor: "#6b4a00", fontWeight: 600 }}
                title="Print sub plans for this week"
              >
                🧑‍🏫 Print Sub Plans
              </button>
            )}
          </div>
        </div>

        {/* Week nav row */}
        <div style={{ borderTop: `1px solid ${D.border0}`, background: D.bg0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 24px", maxWidth: 1440, margin: "0 auto" }}>
            {/* Pace warning */}
            {calendarConfig && !paceOk && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#f59e0b", background: "#2d2000", border: "1px solid #6b4a00", borderRadius: 6, padding: "3px 10px" }}>
                <AlertTriangle size={12} /> {totalDays - availableDays} days over semester
              </div>
            )}
            {calendarConfig && paceOk && (
              <div style={{ fontSize: 12, color: D.text2 }}>
                {totalDays} / {availableDays} days planned
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Week navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={prevWeek} style={{ ...iconBtn, background: D.bg2, border: `1px solid ${D.border1}`, borderRadius: 7, padding: "5px 7px" }}><ChevronLeft size={15} /></button>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text0, minWidth: 200, textAlign: "center" }}>{weekLabel}</div>
              <button onClick={nextWeek} style={{ ...iconBtn, background: D.bg2, border: `1px solid ${D.border1}`, borderRadius: 7, padding: "5px 7px" }}><ChevronRight size={15} /></button>
              <button onClick={goToToday} style={{ ...btnStyle, fontSize: 12, padding: "5px 12px" }}>
                <Sun size={12} /> Today
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content */}
      <div style={{ flex: 1, display: "flex", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <div style={{ flex: 1, padding: "20px 24px", minWidth: 0 }}>

          {/* No curriculum */}
          {!hasLessons && <NoCurriculumPrompt courseName={course?.name} />}

          {/* Setup prompt */}
          {hasLessons && !calendarConfig && <SetupPrompt pathwayColor={pathwayColor} courseName={course?.name} />}

          {/* Calendar grid */}
          {hasLessons && calendarConfig && (
            <>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 8 }}>
                {weekDates.map((d, i) => {
                  const isToday = d === today;
                  const isPast = d < today;
                  const dayOfWeek = parseDate(d).getDate();
                  const monthName = parseDate(d).toLocaleDateString("en-US", { month: "short" });
                  return (
                    <div key={d} style={{ textAlign: "center", padding: "6px 0" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: isToday ? pathwayColor : D.text2, textTransform: "uppercase" }}>{DAY_SHORT[i]}</div>
                      <div style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: "50%", marginTop: 3,
                        background: isToday ? pathwayColor : "none",
                        color: isToday ? "white" : isPast ? D.text2 : D.text0,
                        fontSize: 14, fontWeight: isToday ? 700 : 500,
                      }}>{dayOfWeek}</div>
                      <div style={{ fontSize: 10, color: D.text2, marginTop: 1 }}>{monthName}</div>
                    </div>
                  );
                })}
              </div>

              {/* Swap error toast */}
              {swapError && (
                <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 8, background: "#2d1a0d", border: "1px solid #6b3a1a", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#f97316" }}>
                  <AlertTriangle size={14} /> {swapError}
                </div>
              )}

              {/* Grid cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {weekDates.map((d) => {
                  const dayData = mapping?.[d];
                  const isToday = d === today;
                  const isNI = niSet.has(d);
                  const isDragOver = dragSource !== null && dragSource !== d;

                  // Non-instructional day
                  if (isNI) {
                    return <EmptyCell key={d} dateKey={d} isToday={isToday} isNonInstructional={true} />;
                  }

                  // Blocked day (manually inserted)
                  if (dayData?.type === "block") {
                    return (
                      <BlockCard
                        key={d}
                        dateKey={d}
                        label={dayData.label}
                        isToday={isToday}
                        isDragOver={dragSource && dragSource !== d}
                        pathwayColor={pathwayColor}
                        onContextMenu={(e, dk) => setContextMenu({ type: "block", dateKey: dk, x: e.clientX, y: e.clientY })}
                        onDragOver={(dk) => setDragSource(s => s === null ? null : s)}
                        onDrop={() => { if (dragSource) handleSwap(dragSource, d); setDragSource(null); }}
                        onDragEnd={() => setDragSource(null)}
                      />
                    );
                  }

                  // Lesson day
                  if (dayData?.type === "lesson") {
                    const lesson = lessonMap[dayData.lessonId];
                    const unit = unitMap[dayData.unitId];
                    return (
                      <LessonCard
                        key={d}
                        dateKey={d}
                        lesson={lesson}
                        unit={unit}
                        dayMeta={dayData}
                        weeklyData={weeklyData}
                        isSubDay={!!subDays[d]}
                        isToday={isToday}
                        isSelected={selectedDay === d}
                        isDragOver={dragSource !== null && dragSource !== d}
                        pathwayColor={pathwayColor}
                        onSelect={setSelectedDay}
                        onQuickNote={setQuickNoteDay}
                        onContextMenu={(e, dk) => setContextMenu({ type: "lesson", dateKey: dk, x: e.clientX, y: e.clientY })}
                        onDragStart={(dk) => setDragSource(dk)}
                        onDragOver={(dk) => {}}
                        onDrop={() => { if (dragSource) handleSwap(dragSource, d); setDragSource(null); }}
                        onDragEnd={() => setDragSource(null)}
                      />
                    );
                  }

                  // Empty / unmapped
                  return (
                    <EmptyCell
                      key={d}
                      dateKey={d}
                      isToday={isToday}
                      isNonInstructional={false}
                      isDragOver={dragSource !== null}
                      onDragOver={() => {}}
                      onDrop={() => { if (dragSource) handleSwap(dragSource, d); setDragSource(null); }}
                      onDragEnd={() => setDragSource(null)}
                    />
                  );
                })}
              </div>

              {/* Status legend */}
              <div style={{ marginTop: 20, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: D.text2, marginLeft: 8 }}>Drag to swap · Right-click to adjust pacing · Click for details</span>
              </div>

              {/* Weekly Bell Ringers */}
              <WeeklyBellRingers weekDates={weekDates} mapping={mapping} lessonMap={lessonMap} niSet={niSet} pathwayColor={pathwayColor} />

              <BellRingerPush
                courseId={selectedCourse}
                courseName={course?.name || ""}
                weekDates={weekDates}
                mapping={mapping}
                lessonMap={lessonMap}
                niSet={niSet}
                calendarConfig={calendarConfig}
                pathwayColor={pathwayColor}
                mondayStr={currentMonday}
                driveReady={driveReady}
              />
            </>
          )}
        </div>

        {/* ── Detail Panel */}
        {selectedDay && calendarConfig && mapping && (
          <DetailPanel
            dateKey={selectedDay}
            lesson={selectedLesson}
            unit={selectedUnit}
            dayMeta={selectedDayMeta}
            weeklyData={weeklyData}
            onClose={() => setSelectedDay(null)}
            onNoteChange={handleNoteChange}
            onBellRingerChange={handleBellRingerChange}
            onResourcesChange={handleResourcesChange}
            pathwayColor={pathwayColor}
            pushConfig={pushConfig}
            classroomLog={classroomLog}
            onClassroomPosted={handleClassroomPosted}
            mondayStr={currentMonday}
          />
        )}
      </div>

      {/* ── Footer */}
      <div style={{ borderTop: `1px solid ${D.border0}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <span style={{ fontSize: 11, color: D.text2 }}>Phase 2 · Weekly Dashboard · Auto-saved</span>
        <span style={{ fontSize: 12, color: D.text2 }}>{course?.name} · {pathway?.shortName}</span>
      </div>
    </div>
  );
}
