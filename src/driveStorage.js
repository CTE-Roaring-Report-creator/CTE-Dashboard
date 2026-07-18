// ─── APPS SCRIPT STORAGE (with temporary debug overlay) ──────────────────────
// Replaces the Google OAuth / Drive API version. All data is stored as JSON
// files in the "CTE Dashboard Data" folder of the school Drive, via the
// Apps Script web app.
//
// The debug overlay paints every storage call at the bottom of the screen.
// Once the calendar bug is fixed, this file can be swapped for the clean
// version (or just leave it — it's harmless, only visible when calls happen).

// ⚠️ PASTE YOUR NEW SCHOOL SCRIPT /exec URL HERE:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxm-oCufPdG60N2I-9ZkGlHfU1KPftMmOJ3oM6KEJxn74PX9tGVEWQ8XFTKvZTsBvK-cA/exec';

// ─── DEBUG OVERLAY (temporary) ───────────────────────────────────────────────

function debugLog(msg, isError) {
  let box = document.getElementById('storage-debug');
  if (!box) {
    box = document.createElement('div');
    box.id = 'storage-debug';
    box.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;max-height:35vh;overflow:auto;' +
      'background:#111;color:#0f0;font:11px monospace;padding:6px 10px;z-index:99999;' +
      'border-top:2px solid #0f0;white-space:pre-wrap;';
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.textContent = new Date().toLocaleTimeString() + '  ' + msg;
  if (isError) line.style.color = '#f55';
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

// ─── CORE TRANSPORT (single declaration) ─────────────────────────────────────

async function callScript(body) {
  const label = body.action + ' ' + (body.key || '');
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // text/plain avoids CORS preflight
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      debugLog('✗ ' + label + ' → HTTP ' + res.status + ' NON-JSON: ' + text.slice(0, 120), true);
      throw new Error('Non-JSON response');
    }
    if (!data.ok) {
      debugLog('✗ ' + label + ' → ' + (data.message || 'not ok'), true);
      throw new Error(data.message || 'Script error');
    }
    debugLog('✓ ' + label + (body.action === 'loadData' ? (data.value === null ? ' → null' : ' → data') : ' → saved'));
    return data;
  } catch (err) {
    if (err.message !== 'Non-JSON response' && (err.message || '').indexOf('Script error') === -1 && !err.__logged) {
      debugLog('✗ ' + label + ' → ' + err.message, true);
    }
    throw err;
  }
}

// NOTE: the Apps Script side appends ".json" to the key, so the key here is
// the original filename minus ".json".
async function readFile(key) {
  const r = await callScript({ action: 'loadData', key });
  return r.value; // null if the file doesn't exist
}

async function writeFile(key, data) {
  return callScript({ action: 'saveData', key, value: data });
}

// ─── AUTH (legacy stubs — sign-in no longer exists) ─────────────────────────

export function isSignedIn() { return true; }

export async function initGoogleAuth() { return true; }

export function signIn() { return Promise.resolve(true); }

export function signOut() {}

// ─── PUBLIC STORAGE API ──────────────────────────────────────────────────────

export async function loadCurriculum(courseId) {
  try { return await readFile(`curriculum-${courseId}`); }
  catch (_) { return null; }
}

export async function saveCurriculum(courseId, data) {
  try { await writeFile(`curriculum-${courseId}`, data); }
  catch (e) { console.error('[Storage] saveCurriculum failed:', e); }
}

export async function loadSettings() {
  try {
    const val = await readFile('app-settings');
    return val || { selectedCourse: 'intro-tech', mediaYear: 'media-a' };
  } catch (_) { return { selectedCourse: 'intro-tech', mediaYear: 'media-a' }; }
}

export async function saveSettings(settings) {
  try { await writeFile('app-settings', settings); }
  catch (e) { console.error('[Storage] saveSettings failed:', e); }
}

export async function loadStandards() {
  try { return await readFile('custom-standards'); }
  catch (_) { return null; }
}

export async function saveStandards(standards) {
  try { await writeFile('custom-standards', standards); }
  catch (e) { console.error('[Storage] saveStandards failed:', e); }
}

// ─── WEEKLY DATA ──────────────────────────────────────────────────────────────

export async function loadWeeklyData(courseId) {
  try { return (await readFile(`weekly-data-${courseId}`)) || {}; }
  catch (_) { return {}; }
}

export async function saveWeeklyData(courseId, data) {
  try { await writeFile(`weekly-data-${courseId}`, data); }
  catch (e) { console.error('[Storage] saveWeeklyData failed:', e); }
}

// ─── CALENDAR CONFIG ──────────────────────────────────────────────────────────

export async function loadCalendarConfig() {
  try { return await readFile('calendar-config'); }
  catch (_) { return null; }
}

export async function saveCalendarConfig(config) {
  try { await writeFile('calendar-config', config); }
  catch (e) { console.error('[Storage] saveCalendarConfig failed:', e); }
}

// ─── LESSON MAPPING ───────────────────────────────────────────────────────────

export async function loadMapping(courseId) {
  try { return await readFile(`lesson-mapping-${courseId}`); }
  catch (_) { return null; }
}

export async function saveMapping(courseId, data) {
  try { await writeFile(`lesson-mapping-${courseId}`, data); }
  catch (e) { console.error('[Storage] saveMapping failed:', e); }
}

// ─── SUB DAYS ─────────────────────────────────────────────────────────────────

export async function loadSubDays() {
  try { return (await readFile('sub-days')) || {}; }
  catch (_) { return {}; }
}

export async function saveSubDays(data) {
  try { await writeFile('sub-days', data); }
  catch (e) { console.error('[Storage] saveSubDays failed:', e); }
}

// ─── BELL RINGER PUSH ─────────────────────────────────────────────────────────

export async function loadPushConfig(courseId) {
  try { return await readFile(`bell-push-config-${courseId}`); }
  catch (_) { return null; }
}

export async function savePushConfig(courseId, config) {
  try { await writeFile(`bell-push-config-${courseId}`, config); }
  catch (e) { console.error('[Storage] savePushConfig failed:', e); }
}

export async function loadPushLog(courseId) {
  try { return (await readFile(`bell-push-log-${courseId}`)) || []; }
  catch (_) { return []; }
}

export async function savePushLog(courseId, log) {
  try { await writeFile(`bell-push-log-${courseId}`, log.slice(-20)); }
  catch (e) { console.error('[Storage] savePushLog failed:', e); }
}

// ─── CLASSROOM LOG ────────────────────────────────────────────────────────────

export async function loadClassroomLog(courseId) {
  try { return (await readFile(`classroom-push-log-${courseId}`)) || {}; }
  catch (_) { return {}; }
}

export async function saveClassroomLog(courseId, log) {
  try { await writeFile(`classroom-push-log-${courseId}`, log); }
  catch (e) { console.error('[Storage] saveClassroomLog failed:', e); }
}
