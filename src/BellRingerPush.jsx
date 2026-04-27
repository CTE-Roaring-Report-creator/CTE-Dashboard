import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, AlertTriangle, Send, Settings, X, ExternalLink, FolderOpen } from "lucide-react";

// ─── THEME (mirrors Phase 2) ──────────────────────────────────────────────────

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

const DAY_NAMES   = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT   = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

// ─── STORAGE ─────────────────────────────────────────────────────────────────

function loadPushConfig(courseId) {
  try {
    const v = localStorage.getItem(`bell-push-config:${courseId}`);
    return v ? JSON.parse(v) : null;
  } catch (_) { return null; }
}

function savePushConfig(courseId, config) {
  try {
    localStorage.setItem(`bell-push-config:${courseId}`, JSON.stringify(config));
  } catch (_) {}
}

function loadPushLog(courseId) {
  try {
    const v = localStorage.getItem(`bell-push-log:${courseId}`);
    return v ? JSON.parse(v) : [];
  } catch (_) { return []; }
}

function savePushLog(courseId, log) {
  try {
    localStorage.setItem(`bell-push-log:${courseId}`, JSON.stringify(log.slice(-20)));
  } catch (_) {}
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr) {
  const d = parseDate(dateStr);
  return `${DAY_NAMES[d.getDay() - 1]} - ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
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

function getBellRinger(lesson, dayIndex) {
  if (!lesson) return "";
  if (Array.isArray(lesson.bellRingers)) return lesson.bellRingers[(dayIndex || 1) - 1] || "";
  if (typeof lesson.bellRinger === "string" && lesson.bellRinger) return dayIndex === 1 ? lesson.bellRinger : "";
  return "";
}

function computeWeekNumber(mondayStr, calendarConfig) {
  if (!calendarConfig?.startDate || !mondayStr) return null;
  const mon   = parseDate(mondayStr);
  const niSet = new Set(calendarConfig.nonInstructional || []);

  // Determine which start date to count from
  let startMonday;
  if (calendarConfig.semester2StartDate) {
    const s2Start = parseDate(calendarConfig.semester2StartDate);
    if (mon >= s2Start) {
      // In semester 2 — find the Monday of the semester 2 start week
      startMonday = getMondayOf(calendarConfig.semester2StartDate);
    }
  }
  if (!startMonday) {
    // Semester 1 — find the Monday of the first day of school
    startMonday = getMondayOf(calendarConfig.startDate);
  }

  // Walk forward week by week from startMonday to mondayStr,
  // counting only weeks that have at least one instructional day (Mon–Fri,
  // not in nonInstructional list).
  let weekNum = 0;
  let cursor  = startMonday;

  while (cursor <= mondayStr) {
    // Check Mon–Fri of this week for at least one instructional day
    let hasInstructionalDay = false;
    for (let d = 0; d < 5; d++) {
      const day = addDays(cursor, d);
      if (!niSet.has(day)) {
        hasInstructionalDay = true;
        break;
      }
    }
    if (hasInstructionalDay) weekNum++;
    cursor = addDays(cursor, 7);
  }

  return weekNum >= 1 ? weekNum : null;
}

// Helper: get Monday of the week containing a given date string
function getMondayOf(dateString) {
  const d   = parseDate(dateString);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return dateStr(d);
}

// Helper: dateStr from Date object
function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

// Helper: add n days to a date string
function addDays(dateString, n) {
  const d = parseDate(dateString);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

// Form name follows your existing convention: "Week 1 Bell Work", "Week 2 Bell Work", etc.
function buildFormName(weekNum) {
  return `Week ${weekNum} Bell Work`;
}

// ─── CONFIG MODAL ─────────────────────────────────────────────────────────────

function ConfigModal({ courseId, courseName, config, onSave, onClose }) {
  const [scriptUrl,        setScriptUrl]        = useState(config?.scriptUrl        || "");
  const [personalScriptUrl, setPersonalScriptUrl] = useState(config?.personalScriptUrl || "");
  const [folderId,          setFolderId]          = useState(config?.folderId          || "");
  const [classroomIds,      setClassroomIds]      = useState(config?.classroomIds      || "");

  const handleSave = () => {
    onSave({
      scriptUrl:         scriptUrl.trim(),
      personalScriptUrl: personalScriptUrl.trim(),
      folderId:          folderId.trim(),
      classroomIds:      classroomIds.trim(),
    });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.65)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: D.bg2, border: `1.5px solid ${D.border1}`,
        borderRadius: 12, width: "100%", maxWidth: 540,
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
            <div style={{ fontSize: 15, fontWeight: 700, color: D.text0 }}>Bell Ringer Push — Config</div>
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
            The school script looks inside your <strong style={{ color: "#7aabf0" }}>Bell Work</strong> subfolder for a form named:<br />
            <code style={{ fontSize: 11, background: "#0a1628", padding: "2px 6px", borderRadius: 3, display: "inline-block", marginTop: 3 }}>
              Week 11 Bell Work
            </code>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
              <li><strong>School script</strong> → updates bell ringer questions + posts to Classroom</li>
              <li><strong>Personal script</strong> → updates date picker with section routing via Forms API</li>
            </ul>
          </div>

          {/* School Apps Script URL */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              School Apps Script URL
            </label>
            <input style={inputStyle} value={scriptUrl} onChange={e => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec" />
            <div style={{ fontSize: 11, color: D.text2, marginTop: 4 }}>
              Deploy <code style={{ fontSize: 10 }}>bellringer-push-school.gs</code> from your school account.
            </div>
          </div>

          {/* Personal Apps Script URL */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Personal Apps Script URL
            </label>
            <input style={inputStyle} value={personalScriptUrl} onChange={e => setPersonalScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec" />
            <div style={{ fontSize: 11, color: D.text2, marginTop: 4 }}>
              Deploy <code style={{ fontSize: 10 }}>bellringer-push-personal.gs</code> from your personal Gmail account. Handles date picker section routing.
            </div>
          </div>

          {/* Bell Work Folder ID */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Bell Work Folder ID
            </label>
            <input style={inputStyle} value={folderId} onChange={e => setFolderId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqp..." />
            <div style={{ fontSize: 11, color: D.text2, marginTop: 4 }}>
              Open the <strong style={{ color: D.text1 }}>Bell Work</strong> subfolder inside your course folder
              (e.g. <code style={{ fontSize: 10 }}>101 - Intro to Technology / Bell Work</code>).
              The ID is in the URL:<br />
              <code style={{ fontSize: 10 }}>drive.google.com/drive/folders/<strong>THIS_PART</strong></code>
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
              Add multiple IDs for courses with more than one period (e.g. Intro to Technology).
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BellRingerPush({
  courseId,
  courseName,
  weekDates,
  mapping,
  lessonMap,
  niSet,
  calendarConfig,
  pathwayColor,
  mondayStr,
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [showConfig,    setShowConfig]    = useState(false);
  const [config,        setConfig]        = useState(null);
  const [pushLog,       setPushLog]       = useState([]);
  const [pushStatus,    setPushStatus]    = useState(null);
  const [pushMessage,   setPushMessage]   = useState("");
  const [pushedFormUrl, setPushedFormUrl] = useState(null);

  useEffect(() => {
    setConfig(loadPushConfig(courseId));
    setPushLog(loadPushLog(courseId));
    setPushStatus(null);
    setPushMessage("");
    setPushedFormUrl(null);
  }, [courseId]);

  // ── Build this week's bell ringer data ──────────────────────────────────────
  const weekData = weekDates.map((d, i) => {
    const isNI = niSet.has(d);
    if (isNI) return { date: d, dayName: DAY_NAMES[i], type: "ni" };
    const dayMeta = mapping?.[d];
    if (!dayMeta || dayMeta.type === "block") {
      return { date: d, dayName: DAY_NAMES[i], type: dayMeta?.type || "empty", label: dayMeta?.label };
    }
    const lesson     = lessonMap[dayMeta.lessonId];
    const bellRinger = getBellRinger(lesson, dayMeta.dayIndex || 1);
    return {
      date:        d,
      dayName:     DAY_NAMES[i],
      type:        "lesson",
      bellRinger,
      lessonTitle: lesson?.title || "",
      dayIndex:    dayMeta.dayIndex || 1,
      totalDays:   dayMeta.totalDays || 1,
    };
  });

  const instructionalDays = weekData.filter(d => d.type === "lesson");
  const daysWithQ         = weekData.filter(d => d.type === "lesson" && d.bellRinger);
  const daysWithoutQ      = weekData.filter(d => d.type === "lesson" && !d.bellRinger);
  const allFilled         = daysWithoutQ.length === 0 && daysWithQ.length > 0;

  // ── Week labels ─────────────────────────────────────────────────────────────
  const weekNum    = computeWeekNumber(mondayStr, calendarConfig);
  const weekLabel  = formatWeekLabel(mondayStr);
  const topicLabel = weekNum ? `Week ${weekNum}: ${weekLabel}` : `Week of ${weekLabel}`;

  // "Week 11 Bell Work" — matches your existing Drive naming exactly
  const formName   = weekNum ? buildFormName(weekNum) : `Bell Work – ${weekLabel}`;

  // ── Push ────────────────────────────────────────────────────────────────────
  const handlePush = async () => {
    if (!config?.scriptUrl)         { setPushStatus("error"); setPushMessage("No School Apps Script URL configured. Click ⚙ to set up."); return; }
    if (!config?.personalScriptUrl) { setPushStatus("error"); setPushMessage("No Personal Apps Script URL configured. Click ⚙ to set up."); return; }
    if (!config?.folderId)          { setPushStatus("error"); setPushMessage("No Bell Work Folder ID configured."); return; }
    if (!weekNum) {
      setPushStatus("error");
      setPushMessage("Could not compute week number. Make sure your semester start date is set in Calendar Setup (Phase 3).");
      return;
    }

    setPushStatus("loading");
    setPushMessage(`Looking for "${formName}" in your Bell Work folder…`);
    setPushedFormUrl(null);

    const mediaKey = courseId.startsWith("media") ? "media" : courseId;
    const periods  = (calendarConfig?.periodsByCourse?.[mediaKey] || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    // Only unlock dates up to and including today — the GS daily trigger
    // will unlock each subsequent day automatically at 7 AM.
    const today = dateStr(new Date());

    const payload = {
      folderId:     config.folderId,
      formName,
      classroomIds: (config.classroomIds || "").split(",").map(s => s.trim()).filter(Boolean),
      topicLabel,
      weekLabel,
      weekNum,
      courseName,
      periods,
      days: weekData
        .filter(d => d.type !== "ni")
        .map(d => ({
          date:                d.date,
          dayName:             d.dayName,
          isSchoolDay:         d.type === "lesson" || d.type === "empty",
          isBlocked:           d.type === "block",
          blockLabel:          d.label || "",
          bellRinger:          d.bellRinger || "",
          dateLabel:           formatDateLabel(d.date),
          isDatePickerVisible: d.date <= today,
        })),
    };

    // Personal script payload — only needs what's required for date picker
    const personalPayload = {
      folderId: config.folderId,
      formName,
      days:     payload.days,
    };

    try {
      // Call school script — bell ringers + Classroom
      const res  = await fetch(config.scriptUrl, {
        method: "POST", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let result;
      try { result = JSON.parse(text); } catch (_) { result = { ok: true, message: text }; }

      // Call personal script — date picker routing
      let personalMessage = "";
      try {
        const personalRes  = await fetch(config.personalScriptUrl, {
          method: "POST", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(personalPayload),
        });
        const personalText = await personalRes.text();
        let personalResult;
        try { personalResult = JSON.parse(personalText); } catch (_) { personalResult = { ok: true, message: personalText }; }
        personalMessage = personalResult.message || "";
      } catch (err) {
        personalMessage = "Personal script error: " + err.message;
      }

      const combinedMessage = [result.message, personalMessage].filter(Boolean).join(" · ");

      if (result.ok !== false) {
        setPushStatus("success");
        setPushMessage(combinedMessage || "Pushed successfully!");
        if (result.formUrl) setPushedFormUrl(result.formUrl);

        const entry = {
          ts:        new Date().toISOString(),
          weekLabel, topicLabel, formName,
          formUrl:   result.formUrl || null,
          daysCount: daysWithQ.length,
          created:   result.created || false,
        };
        const newLog = [...pushLog, entry];
        setPushLog(newLog);
        savePushLog(courseId, newLog);
      } else {
        setPushStatus("error");
        setPushMessage(result.message || "Push failed. Check your Apps Script logs.");
      }
    } catch (err) {
      setPushStatus("error");
      setPushMessage(`Network error: ${err.message}. Make sure the Apps Script is deployed with access set to "Anyone".`);
    }
  };

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    savePushConfig(courseId, newConfig);
    setPushStatus(null);
    setPushMessage("");
  };

  const lastPush     = pushLog.length > 0 ? pushLog[pushLog.length - 1] : null;
  const isConfigured = !!(config?.scriptUrl && config?.personalScriptUrl && config?.folderId);

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
          <span style={{ fontSize: 15 }}>📤</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.text0, flex: 1 }}>
            Push to Google Form & Classroom
          </span>

          {!expanded && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {allFilled
                ? <span style={{ fontSize: 11, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}><Check size={11} /> Ready</span>
                : daysWithoutQ.length > 0
                  ? <span style={{ fontSize: 11, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> {daysWithoutQ.length} missing</span>
                  : null
              }
              {lastPush && (
                <span style={{ fontSize: 11, color: D.text2 }}>
                  Last: {new Date(lastPush.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {!isConfigured && <span style={{ fontSize: 11, color: "#f59e0b" }}>Not configured</span>}
            </div>
          )}

          <button
            onClick={e => { e.stopPropagation(); setShowConfig(true); }}
            title="Configure Bell Work folder, template, and Classroom IDs"
            style={{ background: "none", border: "none", cursor: "pointer", color: D.text2, padding: 4, borderRadius: 5, display: "flex" }}
          >
            <Settings size={14} />
          </button>
          {expanded ? <ChevronUp size={15} color={D.text2} /> : <ChevronDown size={15} color={D.text2} />}
        </div>

        {/* ── Expanded body ── */}
        {expanded && (
          <div>

            {/* Form name bar */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${D.border0}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <FolderOpen size={13} color={D.text2} />
              <div style={{ fontSize: 12, color: D.text2 }}>
                Will update or create:&nbsp;
                <span style={{ fontWeight: 600, color: D.text0 }}>{formName}</span>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: allFilled ? "#22c55e" : daysWithoutQ.length > 0 ? "#f59e0b" : D.text2 }}>
                {daysWithQ.length}/{instructionalDays.length} questions ready
              </span>
            </div>

            {/* Calendar config debug row — shows what the app is reading */}
            <div style={{ padding: "7px 16px", borderBottom: `1px solid ${D.border0}`, background: D.bg0, display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: D.text2 }}>
                S1 start:&nbsp;
                <strong style={{ color: calendarConfig?.startDate ? D.text1 : "#f97316" }}>
                  {calendarConfig?.startDate || "⚠ not set"}
                </strong>
              </span>
              <span style={{ fontSize: 11, color: D.text2 }}>
                S2 start:&nbsp;
                <strong style={{ color: calendarConfig?.semester2StartDate ? D.text1 : D.text2 }}>
                  {calendarConfig?.semester2StartDate || "not set"}
                </strong>
              </span>
              <span style={{ fontSize: 11, color: D.text2 }}>
                Monday:&nbsp;
                <strong style={{ color: D.text1 }}>{mondayStr || "unknown"}</strong>
              </span>
              <span style={{ fontSize: 11, color: D.text2 }}>
                Week:&nbsp;
                <strong style={{ color: weekNum ? D.text1 : "#f97316" }}>
                  {weekNum ?? "⚠ could not compute"}
                </strong>
              </span>
            </div>

            {/* Day preview grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
              {weekData.map((day, i) => {
                const isLast = i === weekData.length - 1;
                const hasQ   = day.type === "lesson" && !!day.bellRinger;
                const noQ    = day.type === "lesson" && !day.bellRinger;
                return (
                  <div key={day.date} style={{
                    padding: "10px 12px",
                    borderRight: isLast ? "none" : `1px solid ${D.border0}`,
                    borderBottom: `1px solid ${D.border0}`,
                    background: day.type === "ni" ? "#130a0a" : D.bg1,
                    minHeight: 90, display: "flex", flexDirection: "column", gap: 5,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: D.text2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        {DAY_SHORT[i]}
                      </span>
                      {hasQ && <Check size={12} color="#22c55e" />}
                      {noQ  && <AlertTriangle size={12} color="#f59e0b" />}
                    </div>
                    {day.type !== "ni" && (
                      <div style={{ fontSize: 10, color: D.text2 }}>
                        {formatDateLabel(day.date).split(" - ")[1]}
                      </div>
                    )}
                    {day.type === "ni"    && <span style={{ fontSize: 11, color: D.text2, fontStyle: "italic" }}>No school</span>}
                    {day.type === "block" && <span style={{ fontSize: 11, color: "#f97316", fontStyle: "italic" }}>{day.label || "Blocked"}</span>}
                    {day.type === "empty" && <span style={{ fontSize: 11, color: D.text2, fontStyle: "italic" }}>No lesson</span>}
                    {day.type === "lesson" && (
                      day.bellRinger
                        ? <p style={{ margin: 0, fontSize: 12, color: D.text0, lineHeight: 1.5, flex: 1 }}>{day.bellRinger}</p>
                        : <p style={{ margin: 0, fontSize: 11, color: "#f59e0b", fontStyle: "italic", flex: 1 }}>Missing — add in Phase 1</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Config status + push button */}
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {isConfigured ? (
                <div style={{ fontSize: 12, color: D.text2, display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={12} color="#22c55e" />
                  Configured · {(config.classroomIds || "").split(",").filter(s => s.trim()).length} Classroom section{(config.classroomIds || "").split(",").filter(s => s.trim()).length !== 1 ? "s" : ""}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} /> Click ⚙ to configure before pushing
                </div>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={handlePush}
                disabled={pushStatus === "loading" || !isConfigured}
                style={{
                  ...btnStyle,
                  background: (!isConfigured || pushStatus === "loading") ? D.bg3 : pathwayColor,
                  color: !isConfigured ? D.text2 : "white",
                  borderColor: !isConfigured ? D.border1 : pathwayColor,
                  fontWeight: 600,
                  opacity: pushStatus === "loading" ? 0.7 : 1,
                  cursor: (pushStatus === "loading" || !isConfigured) ? "not-allowed" : "pointer",
                }}
              >
                <Send size={13} />
                {pushStatus === "loading" ? "Pushing…" : "Push to Form & Classroom"}
              </button>
            </div>

            {/* Status message */}
            {pushStatus && pushStatus !== "loading" && (
              <div style={{
                margin: "0 16px 12px", padding: "10px 13px", borderRadius: 8,
                fontSize: 13, lineHeight: 1.5,
                background: pushStatus === "success" ? "#0d2d1a" : "#2d1a0d",
                border: `1px solid ${pushStatus === "success" ? "#1a5433" : "#6b3a1a"}`,
                color: pushStatus === "success" ? "#22c55e" : "#f97316",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                {pushStatus === "success"
                  ? <Check size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  : <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                }
                <div style={{ flex: 1 }}>
                  {pushMessage}
                  {pushedFormUrl && (
                    <div style={{ marginTop: 6 }}>
                      <a href={pushedFormUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#4d8ef0", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Open updated form <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last push log entry */}
            {lastPush && (
              <div style={{ padding: "0 16px 12px" }}>
                <div style={{
                  fontSize: 11, color: D.text2, padding: "8px 12px", borderRadius: 6,
                  background: D.bg2, border: `1px solid ${D.border0}`,
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                }}>
                  <span>Last push: <strong style={{ color: D.text1 }}>{lastPush.formName}</strong></span>
                  <span>·</span>
                  <span>{new Date(lastPush.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <span>·</span>
                  <span>{lastPush.daysCount} question{lastPush.daysCount !== 1 ? "s" : ""}</span>
                  {lastPush.created && <span style={{ color: "#4d8ef0" }}>· new form created</span>}
                  {lastPush.formUrl && (
                    <a href={lastPush.formUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#4d8ef0", display: "inline-flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
                      <ExternalLink size={11} /> Open
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}
