import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, Badge, ErrorBox, OkBox, Pager, input, label, muted, day } from './financeUi';

const SIZE = 20;
const FILTERS = [
  ['', 'All'],
  ['due_soon', 'Due soon'],
  ['grace', 'Overdue (grace)'],
  ['expired', 'Expired'],
  ['trial', 'Free trial'],
  ['active', 'Active'],
  ['none', 'No plan yet'],
];
const STATE_LABEL = { trial: 'Free trial', active: 'Active', grace: 'Overdue', expired: 'Expired', none: 'No plan' };
const STATE_TONE = { trial: 'warn', active: 'good', grace: 'bad', expired: 'bad', none: 'warn' };
const PLAN_FIELDS = [
  ['trial_days', 'Free trial (days)', 'The first month is free'],
  ['monthly_price', 'Monthly price (₹)', 'Before GST and the online payment fee'],
  ['yearly_price', 'Yearly price (₹)', 'Before GST and the online payment fee'],
  ['gst_percent', 'GST on the subscription (%)', '0 if GST is not charged'],
  ['grace_days', 'Grace days after the due date', 'The owner still gets requests during these days'],
  ['warn_days', 'Red warning before the due date (days)', 'The owner sees a red notice this many days before'],
];

/** Admin > Subscriptions: who is on which plan, from when, due when. The Super Admin sets prices and days. */
export const Subscriptions = () => {
  const [plans, setPlans] = useState({});
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/subscriptions/plans', { method: 'POST', body: {} });
      setPlans(Object.fromEntries(Object.entries(res.data).map(([k, v]) => [k, String(v)])));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const body = { min: page * SIZE, max: (page + 1) * SIZE };
      if (filter) body.state = filter;
      if (search.trim()) body.search = search.trim();
      const res = await apiRequest('/admin/subscriptions/list', { method: 'POST', body });
      setRows(res.data || []);
      setSummary(res.summary || {});
      setTotal((res.pagination && res.pagination.total) || 0);
    } catch (err) {
      setError(err.message);
    }
  }, [page, filter, search]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);
  useEffect(() => {
    loadList();
  }, [loadList]);

  const savePlans = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const body = Object.fromEntries(PLAN_FIELDS.map(([k]) => [k, Number(plans[k])]));
      const res = await apiRequest('/admin/subscriptions/plans', { method: 'PUT', body });
      setPlans(Object.fromEntries(Object.entries(res.data).map(([k, v]) => [k, String(v)])));
      setNotice('Saved. New payments use these prices; running subscriptions keep their dates.');
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tableRows = rows.map((r) => [
    <div key="o"><strong>{r.owner.name || '-'}</strong><div style={{ ...muted, fontSize: 12 }}>{r.owner.member_id} · {r.owner.mobile}</div></div>,
    r.plan_label || '-',
    day(r.from_date),
    day(r.due_at),
    r.due_at ? (
      <span key="d" style={{ color: r.level === 'red' ? '#ef4444' : 'inherit', fontWeight: r.level === 'red' ? 700 : 400 }}>
        {r.days_left >= 0 ? `${r.days_left} day${r.days_left === 1 ? '' : 's'}` : `${-r.days_left} day${r.days_left === -1 ? '' : 's'} overdue`}
      </span>
    ) : '-',
    <Badge key="s" tone={STATE_TONE[r.state]}>{STATE_LABEL[r.state]}</Badge>,
    day(r.last_paid_at),
  ]);

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader
        title="Subscriptions"
        subtitle="Crane owners get a free first month, then pay monthly or yearly. The online payment fee is added at payment. Only the Super Admin can change prices."
      />
      <ErrorBox message={error} />
      <OkBox message={notice} />

      <Stats
        items={[
          { label: 'Free trial', value: summary.trial ?? 0 },
          { label: 'Active', value: summary.active ?? 0, color: '#22c55e' },
          { label: 'Due soon', value: summary.due_soon ?? 0, color: '#ef4444', hint: 'Red warning in the app' },
          { label: 'Overdue (grace)', value: summary.grace ?? 0, color: '#ef4444' },
          { label: 'Expired', value: summary.expired ?? 0, color: '#ef4444', hint: 'No requests' },
        ]}
      />

      <Section title="Owners">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {FILTERS.map(([key, text]) => (
            <button key={key || 'all'} type="button" className={filter === key ? 'cranzo-btn-primary-amber' : 'cranzo-btn-secondary'} onClick={() => { setFilter(key); setPage(0); }}>
              {text}
            </button>
          ))}
          <input style={{ ...input, maxWidth: 240, marginLeft: 'auto' }} placeholder="Search name, ID or mobile" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Table
          headers={['Owner', 'Plan', 'From date', 'Due date', 'Time left', 'Status', 'Last paid']}
          rows={tableRows}
          empty="No owners found."
          minWidth={820}
        />
        <Pager page={page} size={SIZE} total={total} onPage={setPage} />
      </Section>

      <Section title="Plans and prices">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {PLAN_FIELDS.map(([key, title, hint]) => (
            <div key={key}>
              <label style={label}>{title}</label>
              <input type="number" min="0" style={input} value={plans[key] ?? ''} onChange={(e) => setPlans({ ...plans, [key]: e.target.value })} />
              <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="cranzo-btn-primary" onClick={savePlans} disabled={saving}>{saving ? 'Saving…' : 'Save plans'}</button>
        </div>
      </Section>
    </div>
  );
};

export default Subscriptions;
