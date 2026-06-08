import { useState, useEffect } from "react";
import {
  ChevronDown, ChevronUp, Check, AlertTriangle, Send, Settings,
  X, ExternalLink, BookOpen, Calendar, Copy,
} from "lucide-react";import { loadClassroomConfig, saveClassroomConfig, loadClassroomLog, saveClassroomLog } from './driveStorage';

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

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "8px 11px",
  border: `1.5px solid ${D.border1}`, borderRadius: 7,
  fontSize: 13, background: D.bg3, color: D.text0,
  outline: "none", fontFamily: "inherit",
};

const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const DAY_NAMES   = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const DAY_SHORT   = ["Mon","Tue","Wed","Thu","Fri"];

// ─── LESSON TYPE → CLASSROOM TYPE ────────────────────────────────────────────
// instruction → Material (no grade, no due date, no copies)
// everything else → Assignment (4 pts, due Friday, copies per resource setting)

const CLASSROOM_TYPE = {
  instruction: "material",
  classwork:   "assignment",
  project:     "assignment",
  assessment:  "assignment",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateString, n) {
  const d = parseDate(dateString);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

function getFridayOf(mondayStr) {
  return addDays(mondayStr, 4);
}

function formatDateShort(dateString) {
  const d = parseDate(dateString);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function formatDateFull(dateString) {
  const d = parseDate(dateString);
  return `${DAY_NAMES[d.getDay() - 1]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function formatWeekLabel(mondayStr) {
  const mon = parseDate(mondayStr);
  const fri = new Date(mon); fri.setDate(fri.getDate() + 4);
  const monLabel = `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}`;
  const friLabel = mon.getMonth() === fri.getMonth()
    ? String(fri.getDate())
    : `${MONTH_NAMES[fri.getMonth()]} ${fri.getDate()}`;
  return `${monLabel} – ${friLabel}`;
}

function computeWeekNumber(mondayStr, calendarConfig) {
  if (!calendarConfig?.startDate || !mondayStr) return null;
  const mon    = parseDate(mondayStr);
  const niSet  = new Set(calendarConfig.nonInstructional || []);

  let startMonday;
  if (calendarConfig.semester2StartDate) {
    const s2Start = parseDate(calendarConfig.semester2StartDate);
    if (mon >= s2Start) startMonday = getMondayOf(calendarConfig.semester2StartDate);
  }
  if (!startMonday) startMonday = getMondayOf(calendarConfig.startDate);

  let weekNum = 0;
  let cursor  = startMonday;
  while (cursor <= mondayStr) {
    let hasInstructional = false;
    for (let i = 0; i < 5; i++) {
      if (!niSet.has(addDays(cursor, i))) { hasInstructional = true; break; }
    }
    if (hasInstructional) weekNum++;
    cursor = addDays(cursor, 7);
  }
  return weekNum >= 1 ? weekNum : null;
}

function getMondayOf(dateString) {
  const d   = parseDate(dateString);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return dateStr(d);
}

// Extract Google Drive file ID from a URL
function parseDriveFileId(url) {
  if (!url) return null;
  // Handles /file/d/ID/view, /d/ID/edit, id=ID, /folders/ID
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
  return url && (url.includes("drive.google.com") || url.includes("docs.google.com"));
}

// ─── CONFIG MODAL ─────────────────────────────────────────────────────────────

function ConfigModal({ courseId, courseName, config, onSave, onClose }) {
  const [scriptUrl,    setScriptUrl]    = useState(config?.scriptUrl    || "");
  const [classroomIds, setClassroomIds] = useState(config?.classroomIds || "");

  const handleSave = () => {
    onSave({ scriptUrl: scriptUrl.trim(), classroomIds: classroomIds.trim() });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.65)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: D.bg2, border: `1.5px solid ${D.border1}`,
        borderRadius: 12, width: "100%", maxWidth: 520,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        maxHeight: "calc(100vh - 40px)", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px 12px", borderBottom: `1.5px solid ${D.border1}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: D.bg2, zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: D.text0 }}>Classroom Push — Config</div>
            <div style={{ fontSize: 12, color: D.text2, marginTop: 2 }}>{courseName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: D.text1, padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* How it works */}
          <div style={{ padding: "12px 14px", borderRadius: 8, background: "#0d1f3d", border: "1px solid #1a3a6b", fontSize: 12, color: "#7aabf0", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: "#4d8ef0", marginBottom: 6 }}>How this works</div>
            Posts lessons to Google Classroom under the existing week topic created by Bell Ringer Push.
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
              <li><strong>Instruction</strong> lessons → posted as <strong>Material</strong> (no grade, no due date)</li>
              <li><strong>Classwork, Project, Assessment</strong> → posted as <strong>Assignment</strong> (4 pts, due Friday)</li>
              <li>Resources flagged "Post to Classroom" in Phase 1 are attached automatically</li>
              <li>Uses the same School Apps Script URL as Bell Ringer Push</li>
            </ul>
          </div>

          {/* Script URL */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              School Apps Script URL
            </label>
            <input style={inputStyle} value={scriptUrl} onChange={e => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec" />
            <div style={{ fontSize: 11, color: D.text2, marginTop: 4 }}>
              Same URL as your Bell Ringer Push school script — the script handles both actions.
            </div>
          </div>

          {/* Classroom IDs */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Google Classroom Course IDs
            </label>
            <input style={inputStyle} value={classroomIds} onChange={e => setClassroomIds(e.target.value)}
              placeholder="123456789, 987654321, 456789123" />
            <div style={{ fontSize: 11, color: D.text2, marginTop: 4 }}>
              Comma-separated. Find in each Classroom URL:<br />
              <code style={{ fontSize: 10 }}>classroom.google.com/c/<strong>THIS_PART</strong></code><br />
              Add multiple IDs for courses with more than one period.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: `1.5px solid ${D.border1}`,
          display: "flex", justifyContent: "flex-end", gap: 10,
          position: "sticky", bottom: 0, background: D.bg2,
        }}>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button onClick={handleSave} style={{ ...btnStyle, background: "#1a56c4", color: "white", borderColor: "#1a56c4", fontWeight: 600 }}>
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LESSON POST CARD ─────────────────────────────────────────────────────────
// Shows one day-1 lesson with its post settings and push button

function LessonPostCard({
  day, lesson, unit, postedEntry, defaultDueDate,
  classroomIds, scriptUrl, weekNum, weekLabel, topicLabel,
  pathwayColor, onPosted,
}) {
  const classroomType = CLASSROOM_TYPE[lesson.type] || "assignment";
  const isMaterial    = classroomType === "material";

  // Editable state — pre-filled from lesson data, adjustable before push
  const [dueDate,   setDueDate]   = useState(defaultDueDate);
  const [resources, setResources] = useState(
    (lesson.links || [])
      .filter(lk => lk.postToClassroom !== false)
      .map(lk => ({ ...lk, _include: true }))
  );
  const [pushStatus,  setPushStatus]  = useState(null); // null | "loading" | "success" | "error"
  const [pushMessage, setPushMessage] = useState("");
  const [postUrl,     setPostUrl]     = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const toggleResource = (id) => {
    setResources(rs => rs.map(r => r.id === id ? { ...r, _include: !r._include } : r));
  };

  const toggleCopy = (id) => {
    setResources(rs => rs.map(r => r.id === id ? { ...r, makeACopy: !r.makeACopy } : r));
  };

  const includedResources = resources.filter(r => r._include);

  const handlePush = async () => {
    if (!scriptUrl) return;
    setPushStatus("loading");
    setPushMessage("Posting to Google Classroom…");
    setPostUrl(null);
    setShowDetails(true); // keep panel open so error is visible

    const attachments = includedResources.map(r => {
      const driveId = isDriveUrl(r.url) ? parseDriveFileId(r.url) : null;
      return {
        label:     r.label,
        url:       r.url,
        driveId,
        makeACopy: !isMaterial && !!r.makeACopy && !!driveId,
        isDrive:   !!driveId,
      };
    });

    const payload = {
      action:         "postLesson",
      classroomIds,
      weekNum,
      weekLabel,
      topicLabel,
      lessonTitle:    lesson.title,
      lessonType:     lesson.type,
      classroomType,
      objective:      lesson.objective || "",
      dueDate:        isMaterial ? null : dueDate,
      points:         isMaterial ? null : 4,
      attachments,
    };

    try {
      const res  = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();

      // If response isn't JSON (e.g. HTML error page from Apps Script),
      // show the raw text so we can diagnose
      let result;
      try {
        result = JSON.parse(text);
      } catch (_) {
        setPushStatus("error");
        setPushMessage(
          text.length > 0
            ? `Unexpected response from Apps Script (not JSON). First 200 chars: ${text.slice(0, 200)}`
            : "Apps Script returned an empty response. Check Executions log in Apps Script for errors."
        );
        return;
      }

      if (result.ok !== false) {
        setPushStatus("success");
        setPushMessage(result.message || "Posted successfully!");
        if (result.postUrl) setPostUrl(result.postUrl);
        onPosted({
          ts:           new Date().toISOString(),
          lessonTitle:  lesson.title,
          classroomType,
          dueDate:      isMaterial ? null : dueDate,
          postUrl:      result.postUrl || null,
          attachCount:  attachments.length,
        });
      } else {
        setPushStatus("error");
        setPushMessage(result.message || "Post failed. Check your Apps Script Executions log for details.");
      }
    } catch (err) {
      setPushStatus("error");
      setPushMessage(`Network error: ${err.message}. Make sure the Apps Script is deployed with access set to "Anyone".`);
    }
  };

  // Type badge colors
  const typeBadge = isMaterial
    ? { bg: "#0d1f3d", border: "#1a3a6b", color: "#4d8ef0", label: "Material" }
    : { bg: "#1a0d3d", border: "#381a6b", color: "#a855f7", label: "Assignment" };

  return (
    <div style={{
      borderRadius: 10, border: `1.5px solid ${D.border1}`,
      background: D.bg1, overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: showDetails ? `1px solid ${D.border0}` : "none",
        background: D.bg2,
      }}>
        {/* Day label */}
        <div style={{ flexShrink: 0, textAlign: "center", minWidth: 36 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {DAY_SHORT[["Monday","Tuesday","Wednesday","Thursday","Friday"].indexOf(day.dayName)]}
          </div>
          <div style={{ fontSize: 11, color: D.text2 }}>{formatDateShort(day.date)}</div>
        </div>

        <div style={{ width: 1, height: 32, background: D.border1, flexShrink: 0 }} />

        {/* Lesson info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lesson.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
              background: typeBadge.bg, color: typeBadge.color, border: `1px solid ${typeBadge.border}`,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {typeBadge.label}
            </span>
            {!isMaterial && (
              <span style={{ fontSize: 11, color: D.text2 }}>Due {formatDateShort(dueDate)} · 4 pts</span>
            )}
            {isMaterial && (
              <span style={{ fontSize: 11, color: D.text2 }}>No grade · No due date</span>
            )}
            {includedResources.length > 0 && (
              <span style={{ fontSize: 11, color: D.text2 }}>
                {includedResources.length} attachment{includedResources.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Already posted badge */}
          {postedEntry && pushStatus !== "success" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e" }}>
              <Check size={12} />
              <span>Posted {new Date(postedEntry.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              {postedEntry.postUrl && (
                <a href={postedEntry.postUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#4d8ef0", display: "flex", alignItems: "center", gap: 3 }}>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setShowDetails(s => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", color: D.text2, padding: 4, display: "flex" }}
            title="Review & adjust before posting"
          >
            {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {/* Push button */}
          {pushStatus === "success" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
              <Check size={13} /> Posted
              {postUrl && (
                <a href={postUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#4d8ef0", display: "flex" }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={handlePush}
              disabled={pushStatus === "loading" || !scriptUrl}
              style={{
                ...btnStyle,
                background: pushStatus === "loading" ? D.bg3 : pathwayColor,
                color: "white", borderColor: pathwayColor, fontWeight: 600,
                opacity: pushStatus === "loading" ? 0.7 : 1,
                cursor: pushStatus === "loading" ? "not-allowed" : "pointer",
                padding: "6px 12px", fontSize: 12,
              }}
            >
              <Send size={12} />
              {pushStatus === "loading" ? "Posting…" : postedEntry ? "Re-post" : "Post"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail — review & adjust */}
      {showDetails && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Due date (assignments only) */}
          {!isMaterial && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={13} color={D.text2} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: D.text2, minWidth: 60 }}>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ ...inputStyle, width: "auto", fontSize: 12, padding: "5px 9px" }}
              />
              <span style={{ fontSize: 11, color: D.text2 }}>· 4 points</span>
            </div>
          )}

          {/* Attachments */}
          {resources.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                Attachments
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resources.map(r => {
                  const drive = isDriveUrl(r.url);
                  const canCopy = !isMaterial && drive;
                  return (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 7,
                      background: r._include ? D.bg3 : D.bg2,
                      border: `1px solid ${r._include ? D.border2 : D.border0}`,
                      opacity: r._include ? 1 : 0.5,
                    }}>
                      {/* Include toggle */}
                      <input
                        type="checkbox" checked={r._include}
                        onChange={() => toggleResource(r.id)}
                        style={{ accentColor: pathwayColor, width: 14, height: 14, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: D.text0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: 10, color: D.text2, marginTop: 1 }}>
                          {drive ? "📁 Google Drive" : "🔗 External link"}
                        </div>
                      </div>
                      {/* Make a copy toggle */}
                      {canCopy && r._include && (
                        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                          <input
                            type="checkbox" checked={!!r.makeACopy}
                            onChange={() => toggleCopy(r.id)}
                            style={{ accentColor: "#a855f7", width: 13, height: 13 }}
                          />
                          <span style={{ fontSize: 11, color: D.text2, whiteSpace: "nowrap" }}>
                            <Copy size={10} style={{ display: "inline", marginRight: 3 }} />
                            Copy per student
                          </span>
                        </label>
                      )}
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#4d8ef0", display: "flex", flexShrink: 0 }}>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: D.text2, fontStyle: "italic" }}>
              No resources flagged for Classroom — add resources in Phase 1 and enable "Post to Classroom" on each.
            </div>
          )}

          {/* Objective preview */}
          {lesson.objective && (
            <div style={{ padding: "8px 10px", borderRadius: 7, background: D.bg2, border: `1px solid ${D.border0}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                Objective (posted as description)
              </div>
              <div style={{ fontSize: 12, color: D.text1, lineHeight: 1.5 }}>{lesson.objective}</div>
            </div>
          )}

          {/* Status message — error or success detail */}
          {pushStatus === "error" && (
            <div style={{
              padding: "9px 12px", borderRadius: 7, fontSize: 12, lineHeight: 1.5,
              background: "#2d1a0d", border: "1px solid #6b3a1a", color: "#f97316",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ wordBreak: "break-word" }}>{pushMessage}</span>
            </div>
          )}
          {pushStatus === "success" && pushMessage && (
            <div style={{
              padding: "9px 12px", borderRadius: 7, fontSize: 12, lineHeight: 1.5,
              background: "#0d2d1a", border: "1px solid #1a5433", color: "#22c55e",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <Check size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{pushMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ClassroomPush({
  courseId,
  courseName,
  weekDates,
  mapping,
  lessonMap,
  unitMap,
  niSet,
  calendarConfig,
  pathwayColor,
  mondayStr,
  driveReady,
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [showConfig,    setShowConfig]    = useState(false);
  const [config,        setConfig]        = useState(null);
  const [postLog,       setPostLog]       = useState({});  // { lessonId: { ts, postUrl, ... } }
  const [loadAttempted, setLoadAttempted] = useState(false);

  // Load config + log from Drive
  useEffect(() => {
    if (!driveReady) return;
    async function load() {
      const [cfg, log] = await Promise.all([
        loadClassroomConfig(courseId),
        loadClassroomLog(courseId),
      ]);
      setConfig(cfg);
      setPostLog(log || {});
      setLoadAttempted(true);
    }
    load();
  }, [courseId, driveReady]);

  const handleOpenConfig = () => {
    if (driveReady && !loadAttempted) {
      loadClassroomConfig(courseId).then(cfg => { if (cfg) setConfig(cfg); setLoadAttempted(true); });
      loadClassroomLog(courseId).then(log => setPostLog(log || {}));
    }
    setShowConfig(true);
  };

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    saveClassroomConfig(courseId, newConfig);
  };

  // ── Build list of day-1 lessons for this week ─────────────────────────────
  const day1Lessons = weekDates
    .map((date, i) => {
      if (niSet.has(date)) return null;
      const meta = mapping?.[date];
      if (!meta || meta.type !== "lesson") return null;
      if ((meta.dayIndex || 1) !== 1) return null; // only day 1
      const lesson = lessonMap[meta.lessonId];
      if (!lesson) return null;
      return {
        date,
        dayName: ["Monday","Tuesday","Wednesday","Thursday","Friday"][i],
        lesson,
        unit: unitMap?.[meta.unitId],
        lessonId: meta.lessonId,
      };
    })
    .filter(Boolean);

  // ── Week meta ─────────────────────────────────────────────────────────────
  const weekNum    = computeWeekNumber(mondayStr, calendarConfig);
  const weekLabel  = formatWeekLabel(mondayStr);
  const topicLabel = weekNum ? `Week ${weekNum}: ${weekLabel}` : `Week of ${weekLabel}`;
  const fridayStr  = getFridayOf(mondayStr);

  const isConfigured = !!(config?.scriptUrl && config?.classroomIds);
  const classroomIdList = (config?.classroomIds || "").split(",").map(s => s.trim()).filter(Boolean);

  // Count how many day-1 lessons this week are already posted
  const postedCount = day1Lessons.filter(d => postLog[d.lessonId]).length;
  const totalCount  = day1Lessons.length;

  const handlePosted = (lessonId, entry) => {
    const newLog = { ...postLog, [lessonId]: entry };
    setPostLog(newLog);
    saveClassroomLog(courseId, newLog);
  };

  return (
    <>
      {showConfig && (
        <ConfigModal
          courseId={courseId} courseName={courseName}
          config={config} onSave={handleSaveConfig} onClose={() => setShowConfig(false)}
        />
      )}

      <div style={{ marginTop: 10, borderRadius: 10, border: `1.5px solid ${D.border1}`, overflow: "hidden", background: D.bg1 }}>

        {/* ── Header ── */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", cursor: "pointer", userSelect: "none",
            borderBottom: expanded ? `1px solid ${D.border0}` : "none",
          }}
        >
          <span style={{ fontSize: 15 }}>🏫</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.text0, flex: 1 }}>
            Post to Google Classroom
          </span>

          {!expanded && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {totalCount === 0 && (
                <span style={{ fontSize: 11, color: D.text2 }}>No new lessons this week</span>
              )}
              {totalCount > 0 && postedCount === totalCount && (
                <span style={{ fontSize: 11, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={11} /> All posted
                </span>
              )}
              {totalCount > 0 && postedCount < totalCount && (
                <span style={{ fontSize: 11, color: D.text2 }}>
                  {postedCount}/{totalCount} posted this week
                </span>
              )}
              {!isConfigured && (
                <span style={{ fontSize: 11, color: "#f59e0b" }}>Not configured</span>
              )}
            </div>
          )}

          {/* Config button */}
          <button
            onClick={e => { e.stopPropagation(); handleOpenConfig(); }}
            title="Configure Classroom Push"
            style={{ background: "none", border: "none", cursor: "pointer", color: D.text2, padding: 4, borderRadius: 5, display: "flex" }}
          >
            <Settings size={14} />
          </button>
          {expanded ? <ChevronUp size={15} color={D.text2} /> : <ChevronDown size={15} color={D.text2} />}
        </div>

        {/* ── Expanded body ── */}
        {expanded && (
          <div>
            {/* Week info bar */}
            <div style={{ padding: "9px 16px", borderBottom: `1px solid ${D.border0}`, background: D.bg0, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: D.text2 }}>
                Topic: <strong style={{ color: D.text1 }}>{topicLabel}</strong>
              </span>
              <span style={{ fontSize: 11, color: D.text2 }}>
                Default due: <strong style={{ color: D.text1 }}>{formatDateFull(fridayStr)}</strong>
              </span>
              <span style={{ fontSize: 11, color: D.text2 }}>
                Sections: <strong style={{ color: isConfigured ? D.text1 : "#f59e0b" }}>
                  {isConfigured ? `${classroomIdList.length} configured` : "⚠ not configured"}
                </strong>
              </span>
            </div>

            {/* Not configured warning */}
            {!isConfigured && (
              <div style={{ margin: "12px 16px", padding: "10px 12px", borderRadius: 8, background: "#2d2000", border: "1px solid #6b4a00", display: "flex", gap: 8, alignItems: "center" }}>
                <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#f59e0b" }}>
                  Click ⚙ to add your Apps Script URL and Classroom course IDs before posting.
                </span>
              </div>
            )}

            {/* Lesson cards */}
            {totalCount === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 13, color: D.text2, fontStyle: "italic" }}>
                No lessons starting this week — days 2+ of ongoing lessons don't need a new post.
              </div>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {day1Lessons.map(({ date, dayName, lesson, unit, lessonId }) => (
                  <LessonPostCard
                    key={lessonId}
                    day={{ date, dayName }}
                    lesson={lesson}
                    unit={unit}
                    postedEntry={postLog[lessonId] || null}
                    defaultDueDate={fridayStr}
                    classroomIds={classroomIdList}
                    scriptUrl={config?.scriptUrl || ""}
                    weekNum={weekNum}
                    weekLabel={weekLabel}
                    topicLabel={topicLabel}
                    pathwayColor={pathwayColor}
                    onPosted={(entry) => handlePosted(lessonId, entry)}
                  />
                ))}
              </div>
            )}

            {/* Footer hint */}
            <div style={{ padding: "8px 16px 12px", fontSize: 11, color: D.text2 }}>
              Only day-1 lessons shown — expand a card to review attachments and due date before posting.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
