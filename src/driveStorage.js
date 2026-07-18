// driveStorage.js — Apps Script backend (no OAuth, no gapi, no sign-in)

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm-oCufPdG60N2I-9ZkGlHfU1KPftMmOJ3oM6KEJxn74PX9tGVEWQ8XFTKvZTsBvK-cA/exec";

async function callScript(body) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || "Script error");
  return data;
}

// No sign-in anymore — always "signed in"
export function isSignedIn() { return true; }

export async function loadCurriculum(courseId) {
  const r = await callScript({ action: "loadData", key: `curriculum-${courseId}` });
  return r.value; // null if not yet saved
}

export async function saveCurriculum(courseId, data) {
  return callScript({ action: "saveData", key: `curriculum-${courseId}`, value: data });
}

export async function loadSettings() {
  const r = await callScript({ action: "loadData", key: "settings" });
  return r.value || {};
}

export async function saveSettings(settings) {
  return callScript({ action: "saveData", key: "settings", value: settings });
}

export async function loadStandards() {
  const r = await callScript({ action: "loadData", key: "standards" });
  return r.value; // null → App falls back to DEFAULT_STANDARDS
}

export async function saveStandards(list) {
  return callScript({ action: "saveData", key: "standards", value: list });
}

// OPTIONAL: batch-load everything in one round trip (much faster startup)
export async function loadAll(keys) {
  const r = await callScript({ action: "loadAll", keys });
  return r.data;
}
