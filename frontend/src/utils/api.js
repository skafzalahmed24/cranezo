// Backend origin. `npm run dev` talks to the local backend; a production build calls the
// same domain it is served from (so cranezo.com -> https://cranezo.com/api).
// Override either with VITE_API_URL (e.g. VITE_API_URL=https://api.example.com).
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)
).replace(/\/+$/, '');

export const AUTH_EXPIRED_EVENT = 'cranezo:auth-expired';
const EXPIRED_FLAG = 'cranezo_session_expired';

/** Forget the saved login and tell the app to go back to the login page */
const handleExpiredSession = () => {
  try {
    localStorage.removeItem('cranezo_token');
    localStorage.removeItem('cranezo_admin');
    sessionStorage.setItem(EXPIRED_FLAG, '1');
  } catch (e) {
    // storage can be blocked, the redirect below still happens
  }
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};

/** True once (and then clears) when the user was just sent to login because the session ended */
export const consumeSessionExpiredFlag = () => {
  try {
    const expired = sessionStorage.getItem(EXPIRED_FLAG) === '1';
    sessionStorage.removeItem(EXPIRED_FLAG);
    return expired;
  } catch (e) {
    return false;
  }
};

/** Authenticated JSON request to the Cranezo API; throws Error(message) on failure */
export const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const token = localStorage.getItem('cranezo_token');
  const response = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    // non-JSON response
  }

  if (response.status === 401) {
    handleExpiredSession();
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!response.ok || !payload || payload.status !== 1) {
    throw new Error((payload && payload.message) || `Request failed (${response.status})`);
  }
  return payload;
};

const MAX_UPLOAD_MB = 2;
const MAX_SIDE = 1920;

/** Upload an image the same way the apps do (POST /upload, multipart). Returns the stored path. */
/**
 * Shrinks a picture to at most 2 MB (Full HD, JPEG) in the browser before it is uploaded. A picture that is
 * already small enough is sent as it is.
 */
export const compressImage = async (file) => {
  const limit = MAX_UPLOAD_MB * 1024 * 1024;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('This picture could not be read.');
  const longest = Math.max(bitmap.width, bitmap.height);
  if (file.size <= limit && longest <= MAX_SIDE) return file;
  let scale = Math.min(1, MAX_SIDE / longest);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // transparent parts become white in a JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= limit) return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    }
    scale *= 0.8; // still too big: make the picture smaller and try again
  }
  throw new Error(`The picture could not be made smaller than ${MAX_UPLOAD_MB} MB.`);
};

export const uploadFile = async (original) => {
  if (!/^image\/(png|jpe?g|webp)$/.test(original.type)) throw new Error('Please choose a PNG, JPG or WebP picture. Videos are not allowed.');
  const file = await compressImage(original);

  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    // non-JSON response
  }
  if (!response.ok || !payload || payload.status !== 1) {
    throw new Error((payload && payload.message) || 'Upload failed. Please try again.');
  }
  return payload.data.file_url;
};

/** Resolve an uploaded file path (/public/uploads/x.png) to a full URL */
export const fileUrl = (path) => {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;
};
