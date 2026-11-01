// Backend origin. `npm run dev` talks to the local backend; a production build calls the
// same domain it is served from (so cranezo.com -> https://cranezo.com/api).
// Override either with VITE_API_URL (e.g. VITE_API_URL=https://api.example.com).
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)
).replace(/\/+$/, '');

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

  if (!response.ok || !payload || payload.status !== 1) {
    throw new Error((payload && payload.message) || `Request failed (${response.status})`);
  }
  return payload;
};

/** Resolve an uploaded file path (/public/uploads/x.png) to a full URL */
export const fileUrl = (path) => {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;
};
