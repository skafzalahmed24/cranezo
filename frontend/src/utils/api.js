export const API_BASE = 'http://localhost:5000';

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
