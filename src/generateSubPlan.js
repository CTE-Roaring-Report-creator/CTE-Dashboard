// ─── SUB PLAN PDF GENERATOR ───────────────────────────────────────────────────
//
// generateSubPlan(dateKeys, subDays, curricula, mappings, calendarConfig)
//
// Opens a print-ready window with one page per sub day date.
// Uses window.print() + @media print CSS — no external libraries needed.
//
// Persistent data is read directly from localStorage (same keys as SubPlanModal):
//   sub-note-template    → intro callout printed at top of every page
//   sub-emergency-info   → emergency / location info printed at bottom of every page
//   sub-standing-bullets → JSON { [courseBaseId]: string[] } prepended per class
//
// Hardcoded: teacher = "Aldridge", room = "E-3"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TEACHER = "Aldridge";
const ROOM    = "E-3";

// localStorage keys — must match SubPlanModal.jsx STORAGE_KEYS
const STORAGE_KEYS = {
  NOTE:      "sub-note-template",
  EMERGENCY: "sub-emergency-info",
  STANDING:  "sub-standing-bullets",
};

// The three physical courses — same as SUB_PLAN_COURSES in SubPlanModal.jsx
const SUB_PLAN_COURSES = [
  { id: "intro-tech",         name: "Intro to Technology",  grades: "6/7"  },
  { id: "digital-innovation", name: "Digital Innovation",   grades: "7/8"  },
  { id: "media",              name: "Digital Media",        grades: "7/8\u20138/9", isMedia: true },
];

// Periods hardcoded per course — overrides calendarConfig for the printed plan.
// Intro to Tech always runs periods 2, 3, and 7.
const HARDCODED_PERIODS = {
  "intro-tech": [2, 3, 7],
};

// Period 6 is always a prep period — inserted in sorted position between courses.
const PREP_PERIOD = 6;

// Day-of-week numbers (0=Sun…6=Sat) that get a chair-stacking bullet on period 7.
// Tuesday = 2, Friday = 5
const CHAIR_STACK_DAYS = new Set([2, 5]);

function isChairStackDay(dateKey) {
  return CHAIR_STACK_DAYS.has(parseLocalDate(dateKey).getDay());
}

// ─── PERSISTENT DATA LOADER ───────────────────────────────────────────────────

function loadPersistentNote() {
  try { return localStorage.getItem(STORAGE_KEYS.NOTE) || ""; } catch (_) { return ""; }
}

function loadEmergencyInfo() {
  try { return localStorage.getItem(STORAGE_KEYS.EMERGENCY) || ""; } catch (_) { return ""; }
}

function loadStandingBullets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STANDING);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatHeaderDate(dateString) {
  return parseLocalDate(dateString).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function parsePeriods(raw) {
  return (raw || "").split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
}

function getPeriodsForCourse(c, calendarConfig) {
  if (HARDCODED_PERIODS[c.id]) return HARDCODED_PERIODS[c.id];
  const key = c.isMedia ? "media" : c.id;
  return parsePeriods(calendarConfig?.periodsByCourse?.[key]);
}

function lowestPeriod(c, calendarConfig) {
  const periods = getPeriodsForCourse(c, calendarConfig);
  return periods.length ? Math.min(...periods) : Infinity;
}

function periodLabel(c, calendarConfig) {
  const periods = getPeriodsForCourse(c, calendarConfig);
  if (!periods.length) return null;
  return `Period${periods.length > 1 ? "s" : ""} ${periods.join(", ")}`;
}

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

function getLessonRef(courseId, dateKey, curricula, mappings) {
  const mapping = mappings?.[courseId];
  const dayMeta = mapping?.[dateKey];
  if (!dayMeta || dayMeta.type !== "lesson") return null;
  const curriculum = curricula?.[courseId];
  if (!curriculum) return null;
  for (const unit of curriculum.units || []) {
    const lesson = unit.lessons?.find(l => l.id === dayMeta.lessonId);
    if (lesson) return { lesson, unit, dayMeta };
  }
  return null;
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Converts newline-separated text into <p> tags (for multi-line note fields)
function textToParas(text) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p>${esc(line)}</p>`)
    .join("\n");
}

// ─── PAGE BUILDER ─────────────────────────────────────────────────────────────

function buildPage(dateKey, subDays, curricula, mappings, calendarConfig, persistentData, isLast) {
  const { note, emergency, standing } = persistentData;
  const mediaYear  = calendarConfig?.mediaYear || "media-a";
  const dayData    = subDays[dateKey] || {};
  const dayNote    = dayData.subNote || "";

  // Sort courses by lowest period number
  const sortedCourses = [...SUB_PLAN_COURSES].sort(
    (a, b) => lowestPeriod(a, calendarConfig) - lowestPeriod(b, calendarConfig)
  );

  // ── Intro callout box (persistent note + optional day-specific note)
  const introNoteHtml = (() => {
    const parts = [];
    if (note.trim())    parts.push(textToParas(note));
    if (dayNote.trim()) parts.push(`<p class="day-note">${esc(dayNote)}</p>`);
    if (!parts.length)  return "";
    return `
      <div class="intro-callout">
        ${parts.join('\n<hr class="note-divider" />\n')}
      </div>`;
  })();

  // ── Course sections
  // Build an interleaved list of course blocks + the prep period marker,
  // all sorted by their lowest period number.
  const chairStack = isChairStackDay(dateKey);

  const courseBlocks = sortedCourses.map(c => {
    const courseId        = c.isMedia ? mediaYear : c.id;
    const pLabel          = periodLabel(c, calendarConfig);
    const ref             = getLessonRef(courseId, dateKey, curricula, mappings);
    const bellRinger      = ref ? getBellRinger(ref.lesson, ref.dayMeta.dayIndex) : "";
    const savedAdditional = dayData.courses?.[courseId]?.instructions || [];
    const standingForCourse = (standing[c.id] || []).filter(s => s.trim());

    // Chair stacking applies to period 7 (Digital Media / Intro to Tech) on Tue & Fri
    const periods = getPeriodsForCourse(c, calendarConfig);
    const hasPeriod7 = periods.includes(7);
    const chairBullet = (chairStack && hasPeriod7)
      ? ["Please have students stack chairs at the end of period 7."]
      : [];

    // Bullet order:
    //  1. Always: bell work
    //  2. If bell ringer: the question (italic)
    //  3. Standing bullets (auto-prepended)
    //  4. Per-day additional bullets
    //  5. Chair-stacking bullet (Tue/Fri, period 7 only)
    const bellBullets    = ["Students will complete their Daily Bell Work on Google Classroom."];
    const bellRingerList = bellRinger ? [bellRinger] : [];
    const allBullets     = [...bellBullets, ...bellRingerList, ...standingForCourse, ...savedAdditional, ...chairBullet];

    const bellCount     = bellBullets.length + bellRingerList.length;
    const standingStart = bellCount;
    const standingEnd   = bellCount + standingForCourse.length;
    const chairStart    = allBullets.length - chairBullet.length;

    const heading = [
      pLabel ? `<span class="period-label">${esc(pLabel)}</span>` : "",
      `<span class="course-name">${esc(c.name)}</span>`,
      `<span class="grade-label">(${esc(c.grades)} Grade)</span>`,
    ].filter(Boolean).join(" ");

    const bulletHtml = allBullets
      .map((b, i) => {
        const isStanding = i >= standingStart && i < standingEnd;
        const isBellQ    = i === 1 && bellRinger;
        const isChair    = i >= chairStart && chairBullet.length > 0;
        const classNames = [
          isBellQ    ? "bullet-bell-q"   : "",
          isStanding ? "bullet-standing" : "",
          isChair    ? "bullet-chair"    : "",
        ].filter(Boolean).join(" ");
        return `<li class="${classNames}">${esc(b)}</li>`;
      })
      .join("\n");

    return {
      sortKey: lowestPeriod(c, calendarConfig),
      html: `
      <div class="course-section">
        <h2 class="course-heading">${heading}</h2>
        <ul class="bullet-list">
          ${bulletHtml}
        </ul>
      </div>`,
    };
  });

  // Insert prep period marker in sorted position
  const prepBlock = {
    sortKey: PREP_PERIOD,
    html: `
      <div class="course-section prep-section">
        <h2 class="course-heading prep-heading">
          <span class="period-label">Period ${PREP_PERIOD}</span>
          <span class="prep-label">— Prep period, no students</span>
        </h2>
      </div>`,
  };
  const allBlocks = [...courseBlocks, prepBlock].sort((a, b) => a.sortKey - b.sortKey);
  const courseSections = allBlocks.map(b => b.html).join("\n");

  // ── Emergency / general info footer box
  const emergencyHtml = emergency.trim() ? `
    <div class="emergency-box">
      <div class="emergency-title">Emergency &amp; General Info</div>
      <div class="emergency-body">${textToParas(emergency)}</div>
    </div>` : "";

  const pageBreak = isLast ? "" : `<div class="page-break"></div>`;

  return `
    <div class="page">
      <div class="page-header">
        <div class="header-date">${esc(formatHeaderDate(dateKey))}</div>
        <div class="header-teacher">${esc(TEACHER)} &nbsp;·&nbsp; Room ${esc(ROOM)}</div>
      </div>

      ${introNoteHtml}

      <div class="courses">
        ${courseSections}
      </div>

      ${emergencyHtml}
    </div>
    ${pageBreak}`;
}

// ─── STYLESHEET ───────────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 12pt;
    color: #1a1a1a;
    background: white;
    padding: 0;
  }

  /* Screen preview */
  @media screen {
    body { background: #e8e8e8; padding: 20px; }
    .page {
      background: white;
      max-width: 8.5in;
      margin: 0 auto 24px;
      padding: 0.85in 0.85in 0.75in;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      border-radius: 4px;
    }
  }

  /* Print */
  @media print {
    body { background: white; padding: 0; }
    .page { padding: 0.65in 0.85in 0.65in; }
    .page-break { page-break-after: always; }
  }

  /* ── Header */
  .page-header {
    border-bottom: 2.5pt solid #1a1a1a;
    padding-bottom: 10pt;
    margin-bottom: 14pt;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .header-date {
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: -0.01em;
    color: #1a1a1a;
  }

  .header-teacher {
    font-size: 11pt;
    color: #444;
    font-style: italic;
    text-align: right;
    white-space: nowrap;
  }

  /* ── Intro callout box (persistent note + day note) */
  .intro-callout {
    border: 1.5pt solid #1a1a1a;
    border-left: 5pt solid #1a1a1a;
    padding: 10pt 14pt;
    margin-bottom: 16pt;
    background: #f7f7f7;
  }

  .intro-callout p {
    font-size: 11pt;
    line-height: 1.65;
    color: #1a1a1a;
    margin-bottom: 4pt;
  }

  .intro-callout p:last-child { margin-bottom: 0; }

  .note-divider {
    border: none;
    border-top: 0.75pt solid #bbb;
    margin: 8pt 0;
  }

  /* Day-specific note gets a slightly italic look */
  .day-note { font-style: italic; color: #333 !important; }

  /* ── Course sections */
  .courses { display: flex; flex-direction: column; gap: 0; }

  .course-section { margin-bottom: 16pt; }

  .course-heading {
    font-size: 12pt;
    font-weight: bold;
    font-family: "Arial", "Helvetica", sans-serif;
    color: #1a1a1a;
    margin-bottom: 5pt;
    padding-bottom: 3pt;
    border-bottom: 0.75pt solid #aaa;
  }

  .period-label  { font-size: 12pt; font-weight: bold; }
  .course-name   { font-size: 12pt; font-weight: bold; }
  .grade-label   { font-size: 11pt; font-weight: normal; color: #555; }

  .bullet-list {
    list-style: disc;
    padding-left: 22pt;
    display: flex;
    flex-direction: column;
    gap: 3pt;
  }

  .bullet-list li {
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
  }

  /* Bell ringer question — italic */
  .bullet-bell-q { font-style: italic; color: #333; }

  /* Standing bullets — slightly indented / muted to visually distinguish */
  .bullet-standing { color: #222; }

  /* Chair-stacking reminder — bold so it stands out */
  .bullet-chair { font-weight: bold; color: #1a1a1a; }

  /* Prep period row — muted, no bullet list */
  .prep-section { margin-bottom: 14pt; opacity: 0.6; }

  .prep-heading {
    font-size: 11pt !important;
    font-style: italic;
    border-bottom: none !important;
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }

  .prep-label {
    font-size: 11pt;
    font-weight: normal;
    color: #666;
  }

  /* ── Emergency & general info box (bottom of page) */
  .emergency-box {
    margin-top: 18pt;
    border: 1.5pt solid #1a1a1a;
    border-top: 3pt solid #1a1a1a;
  }

  .emergency-title {
    font-family: "Arial", "Helvetica", sans-serif;
    font-size: 9.5pt;
    font-weight: bold;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #1a1a1a;
    padding: 5pt 12pt;
    background: #efefef;
    border-bottom: 1pt solid #ccc;
  }

  .emergency-body {
    padding: 8pt 12pt;
  }

  .emergency-body p {
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1a1a1a;
    margin-bottom: 2pt;
    font-family: "Arial", "Helvetica", sans-serif;
  }

  .emergency-body p:last-child { margin-bottom: 0; }
`;

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function generateSubPlan(dateKeys, subDays, curricula, mappings, calendarConfig) {
  if (!dateKeys || dateKeys.length === 0) return;

  // Only include dates actually marked as sub days
  const subDateKeys = dateKeys.filter(d => subDays[d]);
  if (subDateKeys.length === 0) return;

  subDateKeys.sort();

  // Load persistent data once from localStorage
  const persistentData = {
    note:      loadPersistentNote(),
    emergency: loadEmergencyInfo(),
    standing:  loadStandingBullets(),
  };

  const pagesHtml = subDateKeys
    .map((d, i) => buildPage(
      d, subDays, curricula, mappings, calendarConfig,
      persistentData,
      i === subDateKeys.length - 1
    ))
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sub Plans — ${subDateKeys.map(d => formatHeaderDate(d)).join(", ")}</title>
  <style>${CSS}</style>
</head>
<body>
  ${pagesHtml}
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this page and try again.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
