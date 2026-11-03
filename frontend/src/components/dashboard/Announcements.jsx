import React, { useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { apiRequest } from '../../utils/api';

const PAGE_SIZE = 10;

const input = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--dash-input-bg)',
  border: '1px solid var(--dash-input-border)',
  borderRadius: '8px',
  color: 'var(--dash-text-body)',
  padding: '10px 12px',
  fontSize: '13px',
  fontFamily: 'inherit',
};
const label = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-subtle)',
  margin: '0 0 6px',
};
const card = {
  background: 'var(--dash-card)',
  border: '1px solid var(--dash-border)',
  borderRadius: '12px',
  padding: '18px 20px',
};

const AUDIENCES = [
  ['all', 'Everyone (customers, operators and owners)'],
  ['customer', 'Customers'],
  ['operator', 'Operators'],
  ['owner', 'Crane owners'],
];

/** Admin > Announcements: a notification (like "New Feature") delivered to every user of a group */
export const Announcements = () => {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/announcements/list', {
        method: 'POST',
        body: { min: (page - 1) * PAGE_SIZE, max: page * PAGE_SIZE },
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err.message);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const audience = AUDIENCES.find(([id]) => id === form.audience)[1];
    if (!window.confirm(`Send this announcement to: ${audience}?\n\nIt cannot be recalled.`)) return;
    setSending(true);
    try {
      const res = await apiRequest('/admin/announcements/send', { method: 'POST', body: form });
      setNotice(`Sent to ${res.data.sent_count} user(s).`);
      setForm({ title: '', body: '', audience: form.audience });
      setPage(1);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="cranzo-content-view animate-fade-in">
      <div className="cranzo-users-header-row">
        <div>
          <h2 className="cranzo-greeting-title">Announcements</h2>
          <p className="cranzo-greeting-subtitle">Send a notification to every customer, operator or owner, for example about a new feature.</p>
        </div>
      </div>

      <form onSubmit={send} style={{ ...card, maxWidth: 720, marginBottom: 20 }}>
        {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
        {notice && <div style={{ color: '#10b981', marginBottom: 12 }}>{notice}</div>}
        <label style={label}>Send to</label>
        <select className="cranzo-select-dropdown" style={{ width: '100%', marginBottom: 14 }} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
          {AUDIENCES.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
        </select>
        <label style={label}>Title</label>
        <input style={{ ...input, marginBottom: 14 }} placeholder="New Feature" value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label style={label}>Message</label>
        <textarea
          rows={3}
          style={{ ...input, resize: 'vertical', marginBottom: 14 }}
          placeholder="You can now save your favourite cranes for faster booking."
          value={form.body}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <button type="submit" className="cranzo-btn-primary-amber" disabled={sending || !form.title.trim() || !form.body.trim()}>
          <Send size={14} /> {sending ? 'Sending...' : 'Send announcement'}
        </button>
      </form>

      <div style={{ ...card, padding: '8px' }}>
        <div className="cranzo-table-container">
          <table className="cranzo-table">
            <thead>
              <tr>
                <th>SENT</th>
                <th>TITLE</th>
                <th>MESSAGE</th>
                <th>AUDIENCE</th>
                <th>USERS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.sent_at).toLocaleString('en-IN')}</td>
                  <td>{a.title}</td>
                  <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.body}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.audience}</td>
                  <td>{a.sent_count}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--dash-text-muted)' }}>No announcements yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="cranzo-pagination-bar">
          <span className="cranzo-pagination-text">{total} announcement(s) · page {page} of {totalPages}</span>
          <div className="cranzo-pagination-controls">
            <button type="button" className="cranzo-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="cranzo-btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
