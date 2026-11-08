import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, Send, UserCheck, MapPin, Plus, Pencil, Check } from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';

const PAGE_SIZE = 10;

const card = {
  background: 'var(--dash-card)',
  border: '1px solid var(--dash-border)',
  borderRadius: '12px',
  padding: '16px 18px',
};
const input = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--dash-input-bg)',
  border: '1px solid var(--dash-input-border)',
  borderRadius: '8px',
  color: 'var(--dash-text-body)',
  padding: '9px 12px',
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

const STATUS_CLASS = { 0: 'pending', 1: 'in-progress', 2: 'active', 3: 'blocked' };
const PRIORITY_COLOR = { normal: '#94a3b8', high: '#f59e0b', urgent: '#ef4444' };

const ago = (value) => {
  if (!value) return '-';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};
const when = (value) => (value ? new Date(value).toLocaleString('en-IN') : '-');

const Badge = ({ status, text }) => <span className={`cranezo-status-badge ${STATUS_CLASS[status] || 'pending'}`}>{text}</span>;

// ------------------------------------------------------------------ ticket detail

const TicketDetail = ({ ticketId, onClose, onChanged }) => {
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const res = await apiRequest('/admin/support/tickets/get', { method: 'POST', body: { ticket_id: ticketId } });
      setTicket(res.data);
      if (!quiet) setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
    // new messages from the customer show up while the panel is open
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (bottom.current) bottom.current.scrollIntoView({ behavior: 'smooth' });
  }, [ticket && ticket.messages.length]);

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/admin/support/tickets/reply', { method: 'POST', body: { ticket_id: ticketId, message: reply.trim() } });
      setReply('');
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (body) => {
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest(`/admin/support/tickets/${ticketId}`, { method: 'PUT', body });
      setTicket(res.data);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="cranezo-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ ...card, width: 'min(860px, 96vw)', height: 'min(86vh, 760px)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--dash-border-subtle)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--dash-text-title)' }}>{ticket ? ticket.ticket_code : '...'}</strong>
          {ticket && <Badge status={ticket.status} text={ticket.status_label} />}
          {ticket && (
            <span style={{ color: PRIORITY_COLOR[ticket.priority], fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
              {ticket.priority}
            </span>
          )}
          <button type="button" className="cranezo-modal-close-icon-btn" onClick={onClose} style={{ marginLeft: 'auto' }} title="Close">
            <X size={16} />
          </button>
        </div>

        {ticket && (
          <div style={{ display: 'flex', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '10px 18px', color: 'var(--dash-text-body)', fontSize: '13px' }}>
                <strong>{ticket.category_label}:</strong> {ticket.subject}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px' }}>
                {ticket.messages.map((m) => {
                  const mine = m.sender_type === 'admin';
                  const system = m.sender_type === 'system';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: system ? 'center' : mine ? 'flex-end' : 'flex-start', margin: '8px 0' }}>
                      <div
                        style={{
                          maxWidth: '78%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          background: system ? 'transparent' : mine ? 'rgba(245,158,11,0.18)' : 'var(--dash-input-bg)',
                          border: system ? 'none' : '1px solid var(--dash-border-subtle)',
                          color: system ? 'var(--dash-text-subtle)' : 'var(--dash-text-body)',
                          fontStyle: system ? 'italic' : 'normal',
                        }}
                      >
                        {!system && <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)', marginBottom: '3px' }}>{m.sender_label} · {when(m.created_at)}</div>}
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                        {m.attachments.map((url) => (
                          <a key={url} href={fileUrl(url)} target="_blank" rel="noreferrer" style={{ display: 'block', color: '#f59e0b', fontSize: '12px', marginTop: '4px' }}>
                            Attachment
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--dash-border-subtle)' }}>
                {error && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '6px' }}>{error}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    rows={2}
                    style={{ ...input, resize: 'none' }}
                    placeholder={ticket.status === 3 ? 'This request is closed. Reopen it to reply.' : 'Write a reply to the user...'}
                    value={reply}
                    disabled={ticket.status === 3}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
                  />
                  <button type="button" className="cranezo-btn-primary-amber" disabled={busy || ticket.status === 3 || !reply.trim()} onClick={send}>
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: '0 0 250px', borderLeft: '1px solid var(--dash-border-subtle)', padding: '14px 16px', overflowY: 'auto', fontSize: '13px', color: 'var(--dash-text-body)' }}>
              <div style={label}>User</div>
              <div><strong>{ticket.user.full_name || ticket.user.company_name || ticket.user.member_id}</strong></div>
              <div style={{ color: 'var(--dash-text-muted)' }}>{ticket.user.role_name} · {ticket.user.member_id}</div>
              <div>{ticket.user.contact}</div>
              {ticket.user.user_email && <div>{ticket.user.user_email}</div>}

              {ticket.booking && (
                <>
                  <div style={{ ...label, marginTop: '14px' }}>Linked booking</div>
                  <div>{ticket.booking.booking_code}</div>
                  <div style={{ color: 'var(--dash-text-muted)' }}>{ticket.booking.crane_code} · {ticket.booking.crane_type_name}</div>
                </>
              )}
              {ticket.latitude !== null && ticket.longitude !== null && (
                <a
                  href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', marginTop: '12px' }}
                >
                  <MapPin size={14} /> Open emergency location
                </a>
              )}

              <div style={{ ...label, marginTop: '14px' }}>Status</div>
              <select className="cranezo-select-dropdown" style={{ width: '100%' }} value={ticket.status} disabled={busy} onChange={(e) => update({ status: Number(e.target.value) })}>
                <option value={0}>Open</option>
                <option value={1}>In Progress</option>
                <option value={2}>Resolved</option>
                <option value={3}>Closed</option>
              </select>

              <div style={{ ...label, marginTop: '12px' }}>Priority</div>
              <select className="cranezo-select-dropdown" style={{ width: '100%' }} value={ticket.priority} disabled={busy} onChange={(e) => update({ priority: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <div style={{ ...label, marginTop: '12px' }}>Assigned to</div>
              <div style={{ marginBottom: '8px' }}>{ticket.assignee ? ticket.assignee.name : 'Nobody yet'}</div>
              <button type="button" className="cranezo-btn-secondary" disabled={busy} onClick={() => update({ assign_to_me: true })}>
                <UserCheck size={14} /> Assign to me
              </button>

              <div style={{ ...label, marginTop: '14px' }}>Opened</div>
              <div>{when(ticket.created_at)}</div>
            </div>
          </div>
        )}
        {!ticket && <p style={{ padding: '24px', color: 'var(--dash-text-muted)' }}>{error || 'Loading...'}</p>}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ tickets tab

const TicketsTab = ({ onChanged }) => {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const body = { min: (page - 1) * PAGE_SIZE, max: page * PAGE_SIZE };
      if (status) body.status = status;
      if (category) body.category = category;
      if (priority) body.priority = priority;
      if (role) body.role_id = Number(role);
      if (search.trim()) body.search = search.trim();
      const [list, counts] = await Promise.all([
        apiRequest('/admin/support/tickets/list', { method: 'POST', body }),
        apiRequest('/admin/support/tickets/summary', { method: 'POST' }),
      ]);
      setRows(list.data);
      setTotal(list.pagination.total);
      setSummary(counts.data);
    } catch (err) {
      setError(err.message);
    }
  }, [page, status, category, priority, role, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  // new requests arrive while the screen is open
  useEffect(() => {
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const changed = () => {
    load();
    onChanged();
  };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chips = summary
    ? [
        ['open', `Needs attention (${summary.needs_attention})`],
        ['0', `Open (${summary.open})`],
        ['1', `In Progress (${summary.in_progress})`],
        ['2', `Resolved (${summary.resolved})`],
        ['3', `Closed (${summary.closed})`],
        ['', 'All'],
      ]
    : [];

  return (
    <>
      {summary && summary.emergency_open > 0 && (
        <div style={{ ...card, borderColor: '#ef4444', color: '#ef4444', marginBottom: '12px', fontWeight: 600 }}>
          {summary.emergency_open} open emergency request{summary.emergency_open > 1 ? 's' : ''}. Handle them first.
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {chips.map(([value, text]) => (
          <button
            key={text}
            type="button"
            className={status === value ? 'cranezo-btn-primary-amber' : 'cranezo-btn-secondary'}
            onClick={() => { setStatus(value); setPage(1); }}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="cranezo-filter-toolbar">
        <div className="cranezo-filter-search-box">
          <Search size={15} />
          <input
            type="text"
            className="cranezo-filter-search-input"
            placeholder="Search code, subject, name, mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="cranezo-select-dropdown" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          <option value="emergency">Emergency</option>
          <option value="chat">Chat</option>
          <option value="issue">Report an Issue</option>
          <option value="booking_help">Booking Help</option>
          <option value="payment_help">Payment Help</option>
          <option value="general">General</option>
        </select>
        <select className="cranezo-select-dropdown" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>
        <select className="cranezo-select-dropdown" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All users</option>
          <option value="3">Customers</option>
          <option value="2">Operators</option>
          <option value="1">Owners</option>
        </select>
      </div>

      {error && <div style={{ ...card, color: '#ef4444', marginBottom: '12px' }}>{error}</div>}

      <div style={{ ...card, padding: '8px' }}>
        <div className="cranezo-table-container">
          <table className="cranezo-table">
            <thead>
              <tr>
                <th>REQUEST</th>
                <th>USER</th>
                <th>CATEGORY</th>
                <th>SUBJECT</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>LAST ACTIVITY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.ticket_id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(t.ticket_id)}>
                  <td>
                    <span className="cranezo-booking-id highlight">{t.ticket_code}</span>
                    {t.unread_from_user > 0 && (
                      <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>
                        {t.unread_from_user}
                      </span>
                    )}
                  </td>
                  <td>
                    {t.user ? t.user.full_name || t.user.member_id : '-'}
                    <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)' }}>{t.user ? `${t.user.role_name} · ${t.user.contact}` : ''}</div>
                  </td>
                  <td>{t.category_label}</td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</td>
                  <td style={{ color: PRIORITY_COLOR[t.priority], fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>{t.priority}</td>
                  <td><Badge status={t.status} text={t.status_label} /></td>
                  <td>{ago(t.last_message_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: 'var(--dash-text-muted)' }}>No support requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="cranezo-pagination-bar">
          <span className="cranezo-pagination-text">{total} request(s) · page {page} of {totalPages}</span>
          <div className="cranezo-pagination-controls">
            <button type="button" className="cranezo-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="cranezo-btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {openId && <TicketDetail ticketId={openId} onClose={() => { setOpenId(null); changed(); }} onChanged={changed} />}
    </>
  );
};

// ------------------------------------------------------------------ FAQs tab

const emptyFaq = { category_id: '', question: '', answer: '', audience: 'all', is_active: true };

const FaqsTab = () => {
  const [categories, setCategories] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | { id?, ...fields }
  const [newCategory, setNewCategory] = useState({ code: '', name: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const body = { min: 0, max: 100 };
      if (categoryId) body.category_id = Number(categoryId);
      if (search.trim()) body.search = search.trim();
      const [cats, list] = await Promise.all([
        apiRequest('/admin/support/faq-categories/list', { method: 'POST' }),
        apiRequest('/admin/support/faqs/list', { method: 'POST', body }),
      ]);
      setCategories(cats.data);
      setFaqs(list.data);
    } catch (err) {
      setError(err.message);
    }
  }, [categoryId, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveFaq = () =>
    run(async () => {
      const body = {
        category_id: Number(editing.category_id),
        question: editing.question,
        answer: editing.answer,
        audience: editing.audience,
        is_active: editing.is_active,
      };
      if (editing.id) await apiRequest(`/admin/support/faqs/${editing.id}`, { method: 'PUT', body });
      else await apiRequest('/admin/support/faqs', { method: 'POST', body });
      setEditing(null);
    });

  const addCategory = (e) => {
    e.preventDefault();
    run(async () => {
      await apiRequest('/admin/support/faq-categories', { method: 'POST', body: newCategory });
      setNewCategory({ code: '', name: '' });
    });
  };

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ ...card, width: '260px', flexShrink: 0 }}>
        <div style={label}>Categories</div>
        <button type="button" className={`cranezo-nav-item ${categoryId === '' ? 'active' : ''}`} style={{ width: '100%' }} onClick={() => setCategoryId('')}>
          <span>All FAQs</span>
        </button>
        {categories.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: c.is_active ? 1 : 0.5 }}>
            <button type="button" className={`cranezo-nav-item ${String(categoryId) === String(c.id) ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'space-between' }} onClick={() => setCategoryId(String(c.id))}>
              <span>{c.name}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{c.faq_count}</span>
            </button>
            <button
              type="button"
              className="cranezo-action-btn"
              title={c.is_active ? 'Hide category' : 'Show category'}
              onClick={() => run(() => apiRequest(`/admin/support/faq-categories/${c.id}`, { method: 'PUT', body: { is_active: !c.is_active } }))}
            >
              {c.is_active ? <Check size={14} /> : <X size={14} />}
            </button>
          </div>
        ))}
        <form onSubmit={addCategory} style={{ marginTop: 14 }}>
          <div style={label}>Add category</div>
          <input style={{ ...input, marginBottom: 6 }} placeholder="code (e.g. safety)" value={newCategory.code} onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })} />
          <input style={{ ...input, marginBottom: 6 }} placeholder="Name" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
          <button type="submit" className="cranezo-btn-secondary"><Plus size={14} /> Add</button>
        </form>
      </div>

      <div style={{ flex: 1, minWidth: '340px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Search questions and answers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="cranezo-btn-primary-amber" onClick={() => setEditing({ ...emptyFaq, category_id: categoryId || (categories[0] ? categories[0].id : '') })}>
            <Plus size={14} /> Add FAQ
          </button>
        </div>
        {error && <div style={{ ...card, color: '#ef4444', marginBottom: 12 }}>{error}</div>}

        {editing && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={label}>Category</label>
                <select className="cranezo-select-dropdown" style={{ width: '100%' }} value={editing.category_id} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Who sees it</label>
                <select className="cranezo-select-dropdown" style={{ width: '100%' }} value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })}>
                  <option value="all">Everyone</option>
                  <option value="customer">Customers</option>
                  <option value="operator">Operators</option>
                  <option value="owner">Owners</option>
                </select>
              </div>
            </div>
            <label style={{ ...label, marginTop: 12 }}>Question</label>
            <input style={input} value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
            <label style={{ ...label, marginTop: 12 }}>Answer</label>
            <textarea rows={4} style={{ ...input, resize: 'vertical' }} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--dash-text-body)', fontSize: 13 }}>
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Visible in the apps
              </label>
              <button type="button" className="cranezo-btn-primary-amber" style={{ marginLeft: 'auto' }} onClick={saveFaq}>Save</button>
              <button type="button" className="cranezo-btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        {faqs.map((f) => (
          <div key={f.id} style={{ ...card, marginBottom: 10, opacity: f.is_active ? 1 : 0.55 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--dash-text-title)' }}>{f.question}</strong>
                <div style={{ fontSize: 12, color: 'var(--dash-text-subtle)', margin: '2px 0 6px' }}>
                  {f.category_name} · {f.audience === 'all' ? 'Everyone' : f.audience} · helpful {f.helpful_yes} / not {f.helpful_no}
                  {!f.is_active && ' · hidden'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--dash-text-body)', whiteSpace: 'pre-wrap' }}>{f.answer}</div>
              </div>
              <button type="button" className="cranezo-action-btn" title="Edit" onClick={() => setEditing({ ...f })}><Pencil size={14} /></button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <p style={{ color: 'var(--dash-text-muted)' }}>No FAQs found.</p>}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ settings tab

const SettingsTab = () => {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    apiRequest('/admin/support/settings/get', { method: 'POST' })
      .then((res) => setForm(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const save = async () => {
    setError('');
    setNotice('');
    try {
      const body = {
        support_phone: form.support_phone || null,
        emergency_phone: form.emergency_phone || null,
        support_email: form.support_email || '',
        hours_label: form.hours_label,
        team_message: form.team_message,
        chat_welcome: form.chat_welcome,
      };
      const res = await apiRequest('/admin/support/settings', { method: 'PUT', body });
      setForm(res.data);
      setNotice('Saved. The apps use these numbers the next time Help & Support opens.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!form) return <p style={{ color: 'var(--dash-text-muted)' }}>{error || 'Loading...'}</p>;
  const field = (key, text, hint) => (
    <div style={{ marginBottom: 14 }}>
      <label style={label}>{text}</label>
      <input style={input} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      {hint && <div style={{ fontSize: 11, color: 'var(--dash-text-subtle)', marginTop: 4 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ ...card, maxWidth: 640 }}>
      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
      {notice && <div style={{ color: '#10b981', marginBottom: 12 }}>{notice}</div>}
      {field('support_phone', 'Call Support number', 'Shown on the Call Support tile.')}
      {field('emergency_phone', 'Emergency Assistance number', 'Shown on the "Call Now" button. Leave empty to hide the button.')}
      {field('support_email', 'Support email')}
      {field('hours_label', 'Support hours label', 'For example 24/7.')}
      {field('team_message', 'Support team message', 'The line under "Our Support Team is Available".')}
      {field('chat_welcome', 'Chat welcome message', 'The first message of every new chat.')}
      <button type="button" className="cranezo-btn-primary-amber" onClick={save}>Save settings</button>
    </div>
  );
};

// ------------------------------------------------------------------ screen

export const SupportCenter = ({ onChanged = () => {} }) => {
  const [tab, setTab] = useState('tickets');
  const tabs = [
    ['tickets', 'Requests'],
    ['faqs', 'FAQs'],
    ['settings', 'Settings'],
  ];

  return (
    <div className="cranezo-content-view animate-fade-in">
      <div className="cranezo-users-header-row">
        <div>
          <h2 className="cranezo-greeting-title">Support</h2>
          <p className="cranezo-greeting-subtitle">Answer requests from customers, operators and owners, and manage Help &amp; Support content.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {tabs.map(([id, text]) => (
          <button key={id} type="button" className={tab === id ? 'cranezo-btn-primary-amber' : 'cranezo-btn-secondary'} onClick={() => setTab(id)}>
            {text}
          </button>
        ))}
      </div>
      {tab === 'tickets' && <TicketsTab onChanged={onChanged} />}
      {tab === 'faqs' && <FaqsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
};

export default SupportCenter;
