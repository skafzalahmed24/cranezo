import React, { useEffect, useState, useCallback } from 'react';
import OwnerAuth from './OwnerAuth';
import { OwnerCranes } from './OwnerCranes';
import { OwnerTeam } from './OwnerTeam';
import { call, clearSession, getSession, inr, when } from './ownerApi';
import './owner.css';

const PERIODS = [['today', 'Today'], ['6m', '6 months'], ['1y', '1 year'], ['all', 'Overall']];

// which permission opens which page (the owner has every permission)
const PAGES = [
  { id: 'overview', label: 'Overview', need: 'view_dashboard' },
  { id: 'jobs', label: 'Jobs', need: 'view_dashboard' },
  { id: 'cranes', label: 'Cranes', need: 'manage_cranes' },
  { id: 'operators', label: 'Operators', need: 'manage_operators' },
  { id: 'payments', label: 'Payments & report', need: 'view_payments' },
  { id: 'team', label: 'My team', need: 'owner_only' },
];

const can = (session, need) => session && (session.kind === 'owner' || (need !== 'owner_only' && (session.permissions || []).includes(need)));

const Stat = ({ label, value, tone }) => (
  <div className={`op-stat ${tone || ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    call('/owner/earnings/summary', { period: 'all' }).then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);
  if (error) return <div className="op-alert bad">{error}</div>;
  if (!data) return <p className="op-muted">Loading…</p>;
  const e = data.earnings || {};
  return (
    <>
      <h2>Overview</h2>
      <div className="op-stats">
        <Stat label="Jobs completed" value={data.jobs_completed ?? 0} />
        <Stat label="Net earnings" value={inr(e.net_earnings)} tone="good" />
        <Stat label="Platform fee" value={inr(e.platform_fee)} />
        <Stat label="Pending settlement" value={inr(data.settlement?.pending?.amount)} tone="warn" />
      </div>
      <div className="op-card">
        <h3>Today · this week · this month</h3>
        <div className="op-stats">
          {['today', 'week', 'month'].map((k) => (
            <Stat key={k} label={k[0].toUpperCase() + k.slice(1)} value={`${inr(data.cards?.[k]?.net)} · ${data.cards?.[k]?.jobs ?? 0} jobs`} />
          ))}
        </div>
      </div>
    </>
  );
}

function Jobs() {
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setItems(null);
    call('/owner/jobs/list', { tab, min: 0, max: 50 }).then((r) => setItems(r.data || [])).catch((e) => setError(e.message));
  }, [tab]);
  return (
    <>
      <h2>Jobs</h2>
      <div className="op-tabs inline">
        {[['all', 'All'], ['new_requests', 'New'], ['upcoming', 'Upcoming'], ['active', 'Active'], ['completed', 'Completed']].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {error && <div className="op-alert bad">{error}</div>}
      {!items && !error && <p className="op-muted">Loading…</p>}
      {items && items.length === 0 && <p className="op-muted">No jobs here.</p>}
      {items && items.length > 0 && (
        <div className="op-table-wrap">
          <table className="op-table">
            <thead><tr><th>Booking</th><th>Crane</th><th>Place</th><th>Start</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.booking_id}>
                  <td>{j.booking_code}</td>
                  <td>{j.crane?.title || '-'}</td>
                  <td>{j.location?.name || j.location?.address || '-'}</td>
                  <td>{when(j.schedule?.start_at)}</td>
                  <td><span className="op-pill">{j.tab_label || j.status_label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Operators() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [byId, setById] = useState('');
  const [form, setForm] = useState({ full_name: '', mobile_number: '' });
  const load = useCallback(() => call('/owner/operators', { min: 0, max: 100 }).then((r) => setItems(r.data || [])).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const act = async (fn, okMsg) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(okMsg);
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <h2>Operators</h2>
      {error && <div className="op-alert bad">{error}</div>}
      {notice && <div className="op-alert ok">{notice}</div>}
      <div className="op-card">
        <h3>Add an operator who is already on Cranezo</h3>
        <div className="op-row">
          <input placeholder="Operator ID, e.g. OP754197" value={byId} onChange={(e) => setById(e.target.value.toUpperCase())} />
          <button type="button" className="op-btn" disabled={byId.length < 4} onClick={() => act(async () => { await call('/owner/operators/add', { operator_id: byId }); setById(''); }, 'Operator added to your team.')}>Find and add</button>
        </div>
        <h3 style={{ marginTop: 18 }}>Or add a new operator</h3>
        <div className="op-row">
          <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Mobile number" inputMode="numeric" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, '') })} />
          <button type="button" className="op-btn" disabled={!form.full_name || form.mobile_number.length < 6} onClick={() => act(async () => { await call('/owner/operators/add', form); setForm({ full_name: '', mobile_number: '' }); }, 'Operator added.')}>Add</button>
        </div>
      </div>
      {!items && !error && <p className="op-muted">Loading…</p>}
      {items && (
        <div className="op-table-wrap">
          <table className="op-table">
            <thead><tr><th>Name</th><th>Operator ID</th><th>Mobile</th><th>Online</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan="4" className="op-muted">No operators in your team yet.</td></tr>}
              {items.map((o) => (
                <tr key={o.id}><td>{o.full_name}</td><td>{o.member_id}</td><td>{o.mobile_number}</td><td>{o.is_online ? 'Online' : 'Offline'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Payments() {
  const [period, setPeriod] = useState('all');
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setR(null);
    call('/owner/report', { period }).then((x) => setR(x.data)).catch((e) => setError(e.message));
  }, [period]);
  return (
    <>
      <h2>Payments &amp; report</h2>
      <div className="op-tabs inline">
        {PERIODS.map(([id, label]) => <button key={id} type="button" className={period === id ? 'on' : ''} onClick={() => setPeriod(id)}>{label}</button>)}
      </div>
      {error && <div className="op-alert bad">{error}</div>}
      {!r && !error && <p className="op-muted">Loading…</p>}
      {r && (
        <>
          <div className="op-stats">
            <Stat label="Customers paid" value={inr(r.customer_paid)} />
            <Stat label={`Platform fee (${r.platform_fee_percent}%)`} value={inr(r.platform_fee)} />
            <Stat label="Operator payments" value={inr(r.operator_commission?.total)} />
            <Stat label="Your share" value={inr(r.your_share)} tone="good" />
          </div>
          <div className="op-card">
            <h3>Operators</h3>
            <p className="op-muted">Paid {inr(r.operator_commission?.paid)} · Still to pay <strong className="warn-text">{inr(r.operator_commission?.pending)}</strong></p>
            <div className="op-table-wrap">
              <table className="op-table">
                <thead><tr><th>Operator</th><th>Jobs</th><th>Earned</th><th>Paid</th><th>To pay</th></tr></thead>
                <tbody>
                  {(r.operators || []).length === 0 && <tr><td colSpan="5" className="op-muted">No operator payments in this period.</td></tr>}
                  {(r.operators || []).map((o) => (
                    <tr key={o.operator?.id}><td>{o.operator?.name}</td><td>{o.jobs}</td><td>{inr(o.commission)}</td><td>{inr(o.paid)}</td><td className={o.pending > 0 ? 'warn-text' : ''}>{inr(o.pending)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="op-card">
            <h3>Jobs</h3>
            <div className="op-table-wrap">
              <table className="op-table">
                <thead><tr><th>Booking</th><th>Date</th><th>Customer paid</th><th>Platform fee</th><th>Operator</th><th>Your share</th></tr></thead>
                <tbody>
                  {(r.jobs_list || []).length === 0 && <tr><td colSpan="6" className="op-muted">No completed jobs in this period.</td></tr>}
                  {(r.jobs_list || []).map((j) => (
                    <tr key={j.booking_id}><td>{j.booking_code}</td><td>{when(j.completed_at)}</td><td>{inr(j.customer_paid)}</td><td>{inr(j.platform_fee)}</td><td className={j.operator_paid ? '' : 'warn-text'}>{inr(j.operator_commission)}</td><td>{inr(j.your_share)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function OwnerPortal({ onNavigate }) {
  const [session, setSession] = useState(getSession);
  const [page, setPage] = useState(null);

  useEffect(() => {
    document.title = 'Cranezo | Owner portal';
    const expired = () => setSession(null);
    window.addEventListener('cranezo:owner-expired', expired);
    return () => window.removeEventListener('cranezo:owner-expired', expired);
  }, []);

  if (!session) return <OwnerAuth onSignedIn={() => { setSession(getSession()); setPage(null); }} onHome={() => onNavigate('/')} />;

  const pages = PAGES.filter((p) => can(session, p.need));
  const current = pages.find((p) => p.id === page) || pages[0];
  const signOut = () => { clearSession(); setSession(null); };

  return (
    <div className="op-shell">
      <aside className="op-side">
        <div className="op-brand">Cranezo <small>owner portal</small></div>
        <nav>
          {pages.map((p) => (
            <button key={p.id} type="button" className={current && current.id === p.id ? 'on' : ''} onClick={() => setPage(p.id)}>{p.label}</button>
          ))}
        </nav>
        <div className="op-who">
          <strong>{session.name}</strong>
          <span>{session.kind === 'staff' ? `Employee of ${session.owner_name}` : 'Owner'}</span>
          <button type="button" className="op-link" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="op-main">
        {!current && <div className="op-alert bad">You do not have access to any page yet. Ask the owner to give you permissions.</div>}
        {current && current.id === 'overview' && <Overview />}
        {current && current.id === 'jobs' && <Jobs />}
        {current && current.id === 'cranes' && <OwnerCranes />}
        {current && current.id === 'operators' && <Operators />}
        {current && current.id === 'payments' && <Payments />}
        {current && current.id === 'team' && <OwnerTeam />}
      </main>
    </div>
  );
}
