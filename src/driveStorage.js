// ─── GOOGLE DRIVE STORAGE ────────────────────────────────────────────────────
// Drop-in replacement for localStorage-based storage helpers.
// Saves all curriculum data as JSON files in a dedicated Google Drive folder.

const CLIENT_ID = '213709302814-4tmdpp7rnc91rd0k7de82cv7hklticvi.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'CTE Dashboard Data';

let tokenClient = null;
let accessToken = null;
let folderId = null;
let fileIdCache = {}; // filename -> Drive file ID

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export function isSignedIn() {
  return !!accessToken;
}

export function initGoogleAuth() {
  return new Promise((resolve) => {
    // Timeout after 3 seconds no matter what
    const timeout = setTimeout(() => {
      console.warn('[Drive] initGoogleAuth timed out');
      resolve(false);
    }, 3000);

    function finish() {
      clearTimeout(timeout);
      setupTokenClient(resolve);
    }

    if (window.google?.accounts?.oauth2) {
      finish();
      return;
    }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', () => { clearTimeout(timeout); resolve(false); });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = finish;
      script.onerror = () => { clearTimeout(timeout); resolve(false); };
      document.head.appendChild(script);
    }
  });
}

function setupTokenClient(resolve) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        console.error('[Drive] Auth error:', response.error);
        resolve(false);
        return;
      }
      accessToken = response.access_token;
      // Ensure our folder exists after sign-in
      await ensureFolder();
      resolve(true);
    },
  });
}

export function signIn() {
  return new Promise((resolve) => {
    if (!tokenClient) {
      initGoogleAuth().then(() => {
        tokenClient.callback = async (response) => {
          if (response.error) { resolve(false); return; }
          accessToken = response.access_token;
          await ensureFolder();
          resolve(true);
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
      });
    } else {
      tokenClient.callback = async (response) => {
        if (response.error) { resolve(false); return; }
        accessToken = response.access_token;
        await ensureFolder();
        resolve(true);
      };
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

export function signOut() {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
  folderId = null;
  fileIdCache = {};
}

// ─── FOLDER MANAGEMENT ───────────────────────────────────────────────────────

async function ensureFolder() {
  if (folderId) return folderId;

  // Search for existing folder
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`
  );
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    folderId = data.files[0].id;
    return folderId;
  }

  // Create folder if it doesn't exist
  const createRes = await driveRequest(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  const folder = await createRes.json();
  folderId = folder.id;
  return folderId;
}

// ─── FILE HELPERS ─────────────────────────────────────────────────────────────

async function getFileId(filename) {
  if (fileIdCache[filename]) return fileIdCache[filename];

  await ensureFolder();
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and '${folderId}' in parents and trashed=false&fields=files(id,name)`
  );
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    fileIdCache[filename] = data.files[0].id;
    return fileIdCache[filename];
  }
  return null;
}

async function readFile(filename) {
  const fileId = await getFileId(filename);
  if (!fileId) return null;

  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );
  const text = await res.text();
  return JSON.parse(text);
}

async function writeFile(filename, data) {
  await ensureFolder();
  const fileId = await getFileId(filename);
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json' });

  if (fileId) {
    // Update existing file
    await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      { method: 'PATCH', body: blob }
    );
  } else {
    // Create new file
    const meta = { name: filename, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await driveRequest(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      { method: 'POST', body: form }
    );
    const created = await res.json();
    fileIdCache[filename] = created.id;
  }
}

function driveRequest(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// ─── PUBLIC STORAGE API ──────────────────────────────────────────────────────
// These are drop-in replacements for the original localStorage functions.

export async function loadCurriculum(courseId) {
  if (!isSignedIn()) return null;
  try {
    return await readFile(`curriculum-${courseId}.json`);
  } catch (_) { return null; }
}

export async function saveCurriculum(courseId, data) {
  if (!isSignedIn()) return;
  try {
    await writeFile(`curriculum-${courseId}.json`, data);
  } catch (e) {
    console.error('[Drive] saveCurriculum failed:', e);
  }
}

export async function loadSettings() {
  if (!isSignedIn()) return { selectedCourse: 'intro-tech', mediaYear: 'media-a' };
  try {
    const val = await readFile('app-settings.json');
    return val || { selectedCourse: 'intro-tech', mediaYear: 'media-a' };
  } catch (_) {
    return { selectedCourse: 'intro-tech', mediaYear: 'media-a' };
  }
}

export async function saveSettings(settings) {
  if (!isSignedIn()) return;
  try {
    await writeFile('app-settings.json', settings);
  } catch (e) {
    console.error('[Drive] saveSettings failed:', e);
  }
}

export async function loadStandards() {
  if (!isSignedIn()) return null;
  try {
    return await readFile('custom-standards.json');
  } catch (_) { return null; }
}

export async function saveStandards(standards) {
  if (!isSignedIn()) return;
  try {
    await writeFile('custom-standards.json', standards);
  } catch (e) {
    console.error('[Drive] saveStandards failed:', e);
  }
}
