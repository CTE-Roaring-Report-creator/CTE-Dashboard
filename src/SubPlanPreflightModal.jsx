import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, FileText, Plus, Lock } from "lucide-react";
import { generateSubPlan } from "./generateSubPlan";
import { SUB_PLAN_COURSES, loadStandingBullets, STORAGE_KEYS } from "./SubPlanModal";

// ─── HARDCODED SCHEDULE FACTS ─────────────────────────────────────────────────
// These mirror generateSubPlan.js constants and are used for the bullet preview.

const HARDCODED_PERIODS = { "intro-tech": [2, 3, 7] };
const PREP_PERIOD       = 6;
const CHAIR_STACK_DAYS  = new Set([2, 5]); // Tuesday=2, Friday=5

function isChairStackDay(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return CHAIR_STACK_DAYS.has(new Date(y, m - 1, d).getDay());
}

function getPeriodsForCourse(c, calendarConfig) {
  if (HARDCODED_PERIODS[c.id]) return HARDCODED_PERIODS[c.id];
  const key = c.isMedia ? "media" : c.id;
  const raw = calendarConfig?.periodsByCourse?.[key] || "";
  return raw.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
}

// ─── DESIGN CONSTANTS (mirrors SubPlanModal) ──────────────────────────────────

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
  fontSize: 13, background: D.bg3, color: D.text0,
  outline: "none", fontFamily: "inherit",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatFullDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatShortDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ─── AUTO-GROW TEXTAREA ───────────────────────────────────────────────────────

function AutoTextarea({ value, onChange, placeholder, minRows = 2 }) {
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
        resize: "none", lineHeight: 1.65,
        overflow: "hidden", minHeight: minRows * 22,
      }}
    />
  );
}

// ─── INLINE BULLET EDITOR (compact) ──────────────────────────────────────────

function CompactBulletEditor({ courseId, bullets, onChange, color }) {
  const addLine = () => onChange([...bullets, ""]);

  const updateLine = (i, val) =>
    onChange(bullets.map((s, idx) => idx === i ? val : s));

  const removeLine = (i) => {
    const next = bullets.filter((_, idx) => idx !== i);
    onChange(next.length ? next : []);
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = [...bullets.slice(0, i + 1), "", ...bullets.slice(i + 1)];
      onChange(next);
      setTimeout(() => {
        const els = document.querySelectorAll(`[data-preflight="${courseId}"]`);
        if (els[i + 1]) els[i + 1].focus();
      }, 0);
    }
    if (e.key === "Backspace" && bullets[i] === "" && bullets.length > 1) {
      e.preventDefault();
      removeLine(i);
      setTimeout(() => {
        const els = document.querySelectorAll(`[data-preflight="${courseId}"]`);
        if (els[Math.max(0, i - 1)]) els[Math.max(0, i - 1)].focus();
      }, 0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {bullets.map((line, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <input
            data-preflight={courseId}
            type="text"
            value={line}
            onChange={e => updateLine(i, e.target.value)}
            onKeyDown={e => handleKeyDown(e, i)}
            placeholder="Add a last-minute note..."
            style={{ ...inputStyle, flex: 1, padding: "6px 9px", fontSize: 12 }}
          />
          <button
            onClick={() => removeLine(i)}
            style={{ ...iconBtn, padding: 3, color: D.text2 }}
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={addLine}
        style={{
          alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, color, background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", padding: "2px 0", marginTop: 1,
        }}
      >
        <Plus size={11} /> Add bullet
      </button>
    </div>
  );
}

// ─── BULLET PREVIEW ROW ──────────────────────────────────────────────────────
// Read-only chip showing one bullet with source styling.

function BulletRow({ text, dimmed = false, bold = false, italic = false, color = null }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
      <div style={{
        width: 4, height: 4, borderRadius: "50%", flexShrink: 0, marginTop: 6,
        background: color || (dimmed ? D.text2 : D.text1),
      }} />
      <span style={{
        fontSize: 12, lineHeight: 1.55,
        color: dimmed ? D.text2 : (color || D.text1),
        fontStyle: italic ? "italic" : "normal",
        fontWeight: bold ? 700 : 400,
        opacity: dimmed ? 0.75 : 1,
      }}>
        {text}
      </span>
    </div>
  );
}

// ─── COURSE PREVIEW BLOCK ────────────────────────────────────────────────────
// Shows all bullets exactly as they'll print for one course on one day.

function CoursePreview({ c, courseId, dateKey, subDayData, calendarConfig, standingBullets, addBullets, mediaYear }) {
  const periods    = getPeriodsForCourse(c, calendarConfig);
  const periodStr  = periods.length
    ? `Period${periods.length > 1 ? "s" : ""} ${periods.join(", ")}`
    : null;

  // Bell ringer from curriculum mapping
  const getBellRingerForCourse = () => {
    // We don't have curricula/mappings here — that's OK, show placeholder if not available
    return null;
  };

  const hasPeriod7  = periods.includes(7);
  const chairStack  = isChairStackDay(dateKey) && hasPeriod7;

  const standing    = (standingBullets[c.id] || []).filter(s => s.trim());
  const saved       = subDayData?.courses?.[courseId]?.instructions || [];
  const extra       = (addBullets || []).filter(s => s.trim());

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Course heading */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7, marginBottom: 6,
        paddingBottom: 5, borderBottom: `1px solid ${D.border1}`,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: D.text0 }}>{c.name}</span>
        {periodStr && (
          <span style={{ fontSize: 11, color: D.text2 }}>· {periodStr}</span>
        )}
        {c.isMedia && (
          <span style={{ fontSize: 10, color: c.color }}>
            {mediaYear === "media-b" ? "Yr B" : "Yr A"}
          </span>
        )}
      </div>

      {/* Bullets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 4 }}>
        {/* Bell work — always first */}
        <BulletRow text="Students will complete their Daily Bell Work on Google Classroom." dimmed />

        {/* Standing bullets */}
        {standing.map((b, i) => (
          <BulletRow key={"s" + i} text={b} dimmed />
        ))}

        {/* Saved per-day bullets */}
        {saved.map((b, i) => (
          <BulletRow key={"d" + i} text={b} color={D.text1} />
        ))}

        {/* Last-minute additions (being added right now) */}
        {extra.map((b, i) => (
          <BulletRow key={"e" + i} text={b} color={c.color} bold />
        ))}

        {/* Chair stacking */}
        {chairStack && (
          <BulletRow text="Please have students stack chairs at the end of period 7." bold />
        )}
      </div>
    </div>
  );
}

// ─── DAY SLIDE ────────────────────────────────────────────────────────────────
// One "page" of the stepper — shown for a single sub day date.

function DaySlide({ dateKey, dayAdditions, onDayAdditionsChange, subDayData, calendarConfig, mediaYear }) {
  const dayNote       = dayAdditions.note || "";
  const courseBullets = dayAdditions.courseBullets || {};
  const [standingBullets] = useState(() => loadStandingBullets());

  const setNote = (val) =>
    onDayAdditionsChange({ ...dayAdditions, note: val });

  const setCourse = (courseId, bullets) =>
    onDayAdditionsChange({
      ...dayAdditions,
      courseBullets: { ...courseBullets, [courseId]: bullets },
    });

  // Sort courses by lowest period, interleave prep period marker
  const sortedCourses = [...SUB_PLAN_COURSES].sort(
    (a, b) => Math.min(...getPeriodsForCourse(a, calendarConfig), Infinity)
            - Math.min(...getPeriodsForCourse(b, calendarConfig), Infinity)
  );

  // Build interleaved list with prep period in the right slot
  const courseItems = sortedCourses.map(c => ({
    type: "course",
    c,
    sortKey: Math.min(...getPeriodsForCourse(c, calendarConfig), Infinity),
  }));
  const prepItem = { type: "prep", sortKey: PREP_PERIOD };
  const allItems = [...courseItems, prepItem].sort((a, b) => a.sortKey - b.sortKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Full bullet preview */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: D.text2,
          letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Lock size={10} /> What will print
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 8,
          background: D.bg2, border: `1px solid ${D.border1}`,
        }}>
          {allItems.map((item, idx) => {
            if (item.type === "prep") {
              return (
                <div key="prep" style={{
                  marginBottom: 14, opacity: 0.45,
                  display: "flex", alignItems: "center", gap: 7,
                  paddingBottom: idx < allItems.length - 1 ? 10 : 0,
                  borderBottom: idx < allItems.length - 1 ? `1px solid ${D.border0}` : "none",
                }}>
                  <span style={{ fontSize: 11, fontStyle: "italic", color: D.text2 }}>
                    Period {PREP_PERIOD} — Prep period, no students
                  </span>
                </div>
              );
            }
            const { c } = item;
            const courseId = c.isMedia ? mediaYear : c.id;
            return (
              <div key={courseId} style={{
                paddingBottom: idx < allItems.length - 1 ? 12 : 0,
                marginBottom:  idx < allItems.length - 1 ? 12 : 0,
                borderBottom:  idx < allItems.length - 1 ? `1px solid ${D.border0}` : "none",
              }}>
                <CoursePreview
                  c={c}
                  courseId={courseId}
                  dateKey={dateKey}
                  subDayData={subDayData}
                  calendarConfig={calendarConfig}
                  standingBullets={standingBullets}
                  addBullets={courseBullets[courseId] || []}
                  mediaYear={mediaYear}
                />
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: D.text2, marginTop: 5 }}>
          <span style={{ color: D.text2 }}>●</span> always included &nbsp;
          <span style={{ color: D.text1 }}>●</span> saved &nbsp;
          <span style={{ color: "#4d8ef0" }}>●</span> adding now
          {isChairStackDay(dateKey) && (
            <span style={{ marginLeft: 8, color: "#f59e0b" }}>
              ★ chair-stacking day
            </span>
          )}
        </div>
      </div>

      {/* ── Last-minute day note */}
      <div>
        <label style={{
          fontSize: 12, fontWeight: 600, color: D.text1,
          display: "block", marginBottom: 6,
        }}>
          Last-minute day note
          <span style={{ fontWeight: 400, color: D.text2, marginLeft: 6 }}>
            — appended to the intro callout for this day only
          </span>
        </label>
        <AutoTextarea
          value={dayNote}
          onChange={setNote}
          placeholder="e.g. Fire drill at 10:15. Students may sit with a partner today."
          minRows={2}
        />
      </div>

      {/* ── Per-class last-minute additions */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: D.text1, marginBottom: 10 }}>
          Last-minute class additions
          <span style={{ fontWeight: 400, color: D.text2, marginLeft: 6 }}>
            — shown in blue above, appended after saved instructions
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {SUB_PLAN_COURSES.map(c => {
            const courseId = c.isMedia ? mediaYear : c.id;
            const bullets  = courseBullets[courseId] || [];
            return (
              <div key={courseId}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: c.color,
                  marginBottom: 7, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: c.color }} />
                  {c.name}
                  {c.isMedia && (
                    <span style={{ fontSize: 10, color: D.text2, fontWeight: 400 }}>
                      ({mediaYear === "media-b" ? "Yr B" : "Yr A"})
                    </span>
                  )}
                </div>
                {bullets.length === 0 ? (
                  <button
                    onClick={() => setCourse(courseId, [""])}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 11, color: D.text2, background: "none", border: "none",
                      cursor: "pointer", fontFamily: "inherit", padding: "2px 0",
                    }}
                  >
                    <Plus size={11} /> Add a bullet
                  </button>
                ) : (
                  <CompactBulletEditor
                    courseId={courseId}
                    bullets={bullets}
                    onChange={next => setCourse(courseId, next)}
                    color={c.color}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export default function SubPlanPreflightModal({
  dateKeys,
  subDays,
  curricula,
  mappings,
  calendarConfig,
  pathwayColor,
  onClose,
}) {
  const mediaYear   = calendarConfig?.mediaYear || "media-a";

  // Only the dates that are marked as sub days, sorted
  const subDateKeys = dateKeys.filter(d => subDays[d]).sort();

  // Per-day last-minute additions: { [dateKey]: { note: string, courseBullets: { [courseId]: string[] } } }
  const [additions, setAdditions] = useState(() => {
    const init = {};
    for (const d of subDateKeys) init[d] = { note: "", courseBullets: {} };
    return init;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentDate = subDateKeys[currentIndex];

  const setDayAdditions = (dateKey, val) =>
    setAdditions(prev => ({ ...prev, [dateKey]: val }));

  // Merge last-minute additions into subDays data before generating
  const handleGenerate = () => {
    const augmentedSubDays = {};

    for (const dateKey of subDateKeys) {
      const base = { ...(subDays[dateKey] || {}) };
      const add  = additions[dateKey] || {};

      // Merge day note
      const baseNote = base.subNote || "";
      const addNote  = (add.note || "").trim();
      base.subNote   = addNote
        ? (baseNote ? `${baseNote}\n${addNote}` : addNote)
        : baseNote;

      // Merge per-course bullets
      const mergedCourses = { ...(base.courses || {}) };
      for (const c of SUB_PLAN_COURSES) {
        const courseId    = c.isMedia ? mediaYear : c.id;
        const addBullets  = (add.courseBullets?.[courseId] || []).filter(s => s.trim());
        if (!addBullets.length) continue;
        const existing    = mergedCourses[courseId]?.instructions || [];
        mergedCourses[courseId] = { instructions: [...existing, ...addBullets] };
      }
      base.courses = mergedCourses;
      augmentedSubDays[dateKey] = base;
    }

    generateSubPlan(subDateKeys, augmentedSubDays, curricula, mappings, calendarConfig);
    onClose();
  };

  const hasAdditions = (dateKey) => {
    const add = additions[dateKey];
    if (!add) return false;
    if (add.note?.trim()) return true;
    return Object.values(add.courseBullets || {}).some(arr => arr.some(s => s.trim()));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "24px 16px 40px",
      backgroundColor: "rgba(5,7,15,0.92)",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: D.bg1, borderRadius: 16,
        border: `1.5px solid ${D.border1}`,
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        width: "100%", maxWidth: 680,
        display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 64px)",
        overflow: "hidden",
      }}>

        {/* ── Header */}
        <div style={{
          padding: "14px 24px 12px",
          borderBottom: `1.5px solid ${D.border1}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: D.bg2, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={16} color={D.text1} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text0 }}>
                Generate Sub Plans
              </div>
              <div style={{ fontSize: 12, color: D.text2, marginTop: 1 }}>
                Review and add last-minute notes before printing
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

        {/* ── Stepper tabs */}
        {subDateKeys.length > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 24px",
            borderBottom: `1px solid ${D.border1}`,
            background: D.bg2, flexShrink: 0,
            overflowX: "auto",
          }}>
            {subDateKeys.map((d, i) => {
              const isActive  = i === currentIndex;
              const hasAdds   = hasAdditions(d);
              return (
                <button
                  key={d}
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                    border: isActive
                      ? `1.5px solid ${pathwayColor}`
                      : `1.5px solid ${D.border1}`,
                    background: isActive ? pathwayColor + "22" : D.bg3,
                    color: isActive ? D.text0 : D.text1,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    position: "relative",
                  }}
                >
                  {formatShortDate(d)}
                  {hasAdds && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 8, height: 8, borderRadius: "50%",
                      background: pathwayColor,
                      border: `1.5px solid ${D.bg2}`,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Scrollable body */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px 24px",
          background: D.bg1,
        }}>
          {/* Date heading */}
          <div style={{
            fontSize: 14, fontWeight: 700, color: D.text0,
            marginBottom: 18, paddingBottom: 10,
            borderBottom: `1px solid ${D.border1}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{formatFullDate(currentDate)}</span>
            {subDateKeys.length > 1 && (
              <span style={{ fontSize: 12, color: D.text2, fontWeight: 400 }}>
                {currentIndex + 1} of {subDateKeys.length}
              </span>
            )}
          </div>

          <DaySlide
            key={currentDate}
            dateKey={currentDate}
            dayAdditions={additions[currentDate] || { note: "", courseBullets: {} }}
            onDayAdditionsChange={val => setDayAdditions(currentDate, val)}
            subDayData={subDays[currentDate]}
            calendarConfig={calendarConfig}
            mediaYear={mediaYear}
          />
        </div>

        {/* ── Footer */}
        <div style={{
          padding: "12px 24px",
          borderTop: `1.5px solid ${D.border1}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: D.bg2, flexShrink: 0, gap: 10,
        }}>
          {/* Prev / Next */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              style={{
                ...btnStyle,
                opacity: currentIndex === 0 ? 0.35 : 1,
                pointerEvents: currentIndex === 0 ? "none" : "auto",
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setCurrentIndex(i => Math.min(subDateKeys.length - 1, i + 1))}
              disabled={currentIndex === subDateKeys.length - 1}
              style={{
                ...btnStyle,
                opacity: currentIndex === subDateKeys.length - 1 ? 0.35 : 1,
                pointerEvents: currentIndex === subDateKeys.length - 1 ? "none" : "auto",
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={onClose} style={btnStyle}>Cancel</button>
            <button
              onClick={handleGenerate}
              style={{
                ...btnStyle,
                background: pathwayColor, color: "white",
                borderColor: pathwayColor, fontWeight: 600,
              }}
            >
              <FileText size={14} />
              Print {subDateKeys.length} plan{subDateKeys.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
