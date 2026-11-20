// The owner's website talks to the same API as the apps. The owner signs in with the mobile OTP login; an employee
// (sub-admin) signs in with email and password. Both get a token, kept apart from the admin panel's token.
import { API_BASE, uploadFile } from '../utils/api';

export { uploadFile, API_BASE };
export const TOKEN_KEY = 'cranezo_owner_token';
export const SESSION_KEY = 'cranezo_owner_session';

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
};
export const saveSession = (token, session) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
};

/** JSON request; throws Error(message). A 401 drops the session (the page then shows the sign-in). */
export const call = async (path, body = {}, { auth = true } = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    // not JSON
  }
  if (response.status === 401 && auth) {
    clearSession();
    window.dispatchEvent(new Event('cranezo:owner-expired'));
    throw new Error('Your session has ended. Please sign in again.');
  }
  if (!response.ok || !payload || payload.status !== 1) throw new Error((payload && payload.message) || `Request failed (${response.status})`);
  return payload;
};

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
