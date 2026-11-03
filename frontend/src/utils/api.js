// Backend origin. `npm run dev` talks to the local backend; a production build calls the
// same domain it is served from (so cranezo.com -> https://cranezo.com/api).
// Override either with VITE_API_URL (e.g. VITE_API_URL=https://api.example.com).
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)
).replace(/\/+$/, '');

export const AUTH_EXPIRED_EVENT = 'cranzo:auth-expired';
const EXPIRED_FLAG = 'cranzo_session_expired';

/** Forget the saved login and tell the app to go back to the login page */
const handleExpiredSession = () => {
  try {
    localStorage.removeItem('cranzo_token');
    localStorage.removeItem('cranzo_admin');
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

/** Authenticated JSON request to the Cranzo API; throws Error(message) on failure */
export const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const token = localStorage.getItem('cranzo_token');
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

const MAX_UPLOAD_MB = 5;

/** Upload an image the same way the apps do (POST /upload, multipart). Returns the stored path. */
export const uploadFile = async (file) => {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Please choose a PNG, JPG or WebP image.');
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`The image is too large (maximum ${MAX_UPLOAD_MB} MB).`);

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
