import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, Badge, ErrorBox, Pager, input, muted, inr, when } from './financeUi';

const SIZE = 20;
const TONE = { searching: 'warn', accepted: 'warn', confirmed: 'good', expired: 'bad', payment_expired: 'bad', cancelled: 'bad', not_found: 'bad' };
const FILTERS = [
  ['needs_action', 'No crane found (call customer)'],
  ['searching', 'Searching now'],
  ['accepted', 'Waiting for advance'],
  ['confirmed', 'Booked'],
  ['expired', 'Nobody accepted'],
  ['payment_expired', 'Advance not paid'],
  ['', 'All'],
];

/** Admin > Crane Requests: every Rapido-style request; "no crane found" ones are handled by the team */
export const CraneRequests = () => {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('needs_action');
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const body = { min: page * SIZE, max: (page + 1) * SIZE };
      if (status) body.status = status;
      const [list, sum] = await Promise.all([
        apiRequest('/admin/crane-requests', { method: 'POST', body }),
        apiRequest('/admin/crane-requests/summary', { method: 'POST' }),
      ]);
      setRows(list.data);
      setTotal(list.pagination ? list.pagination.total : list.data.length);
      setSummary(sum.data);
    } catch (err) {
      setError(err.message);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (r, adminStatus) => {
    try {
      await apiRequest('/admin/crane-requests/update', {
        method: 'PUT',
        body: { request_id: r.request_id, admin_status: adminStatus, admin_note: notes[r.request_id] ?? r.admin_note ?? '' },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader
        title="Crane Requests"
        subtitle="Customer requests sent to nearby owners. When no owner takes one, the customer can send it to the team: call them and arrange a crane."
      />
      <ErrorBox message={error} />
      {summary && (
        <Stats
          items={[
            { label: 'No crane found (new)', value: summary.not_found_new, color: summary.not_found_new ? '#ef4444' : undefined },
            { label: 'Searching now', value: summary.searching },
            { label: 'Waiting for advance', value: summary.awaiting_payment },
            { label: 'Expired (24h)', value: summary.expired_today },
          ]}
        />
      )}
      <Section
        title="Requests"
        right={(
          <select className="cranzo-select-dropdown" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
            {FILTERS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        )}
      >
        <Table
          headers={['Created', 'Request', 'Crane', 'Where / when', 'Offer', 'Customer', 'Status', status === 'needs_action' ? 'Team action' : 'Note']}
          rows={rows.map((r) => [
            when(r.created_at),
            <strong key="c">{r.request_code}</strong>,
            r.crane_title,
            <div key="w">
              <div>{r.location}</div>
              <div style={muted}>{when(r.start_at)} · {r.duration_label}</div>
            </div>,
            <div key="o">
              {inr(r.offer_amount)}
              {r.raise_count > 0 && <div style={muted}>raised {r.raise_count}x</div>}
            </div>,
            r.customer ? (
              <div key="cu">
                <div>{r.customer.name}</div>
                <div style={muted}>{r.customer.contact}</div>
              </div>
            ) : '-',
            <Badge key="s" tone={TONE[r.status]}>{r.status_label}</Badge>,
            r.status === 'not_found' ? (
              <div key="a" style={{ minWidth: 220 }}>
                {r.note && <div style={{ ...muted, marginBottom: 6 }}>Customer: "{r.note}"</div>}
                <input
                  style={{ ...input, marginBottom: 6 }}
                  placeholder="Team note"
                  value={notes[r.request_id] ?? r.admin_note ?? ''}
                  onChange={(e) => setNotes({ ...notes, [r.request_id]: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className={r.admin_status === 'contacted' ? 'cranzo-btn-primary-amber' : 'cranzo-btn-secondary'} onClick={() => update(r, 'contacted')}>Contacted</button>
                  <button type="button" className={r.admin_status === 'closed' ? 'cranzo-btn-primary-amber' : 'cranzo-btn-secondary'} onClick={() => update(r, 'closed')}>Closed</button>
                </div>
              </div>
            ) : (r.admin_note || '-'),
          ])}
          empty="Nothing here."
          minWidth={1100}
        />
        <Pager page={page} size={SIZE} total={total} onPage={setPage} />
      </Section>
    </div>
  );
};

export default CraneRequests;
