import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';
import { PageHeader, Section, Stats, Table, Badge, ErrorBox, Pager, card, input, label, muted, inr, when } from './financeUi';

const SIZE = 20;
const STATUS_TONE = { open: 'bad', in_review: 'warn', resolved: 'good', rejected: 'warn' };
const STATUS_OPTIONS = [
  ['open', 'Open'],
  ['in_review', 'In Review'],
  ['resolved', 'Resolved'],
  ['rejected', 'Closed - not upheld'],
];

/** Admin > Complaints: customer complaints and payment disputes, worked on until resolved */
export const Complaints = () => {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const body = { min: page * SIZE, max: (page + 1) * SIZE };
      if (status) body.status = status;
      if (search.trim()) body.search = search.trim();
      const [list, sum] = await Promise.all([
        apiRequest('/admin/complaints', { method: 'POST', body }),
        apiRequest('/admin/complaints/summary', { method: 'POST' }),
      ]);
      setRows(list.data);
      setTotal(list.pagination ? list.pagination.total : list.data.length);
      setSummary(sum.data);
    } catch (err) {
      setError(err.message);
    }
  }, [page, status, search]);

  useEffect(() => {
    if (!openId) load();
  }, [load, openId]);

  if (openId) return <ComplaintDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader title="Complaints" subtitle="Customer complaints and payment disputes. The owner sees the same complaint and can reply; only you can close one as not upheld." />
      <ErrorBox message={error} />
      {summary && (
        <Stats
          items={[
            { label: 'Open', value: summary.open, color: summary.open ? '#ef4444' : undefined },
            { label: 'In review', value: summary.in_review },
            { label: 'Payment disputes open', value: summary.payment_disputes_open, color: summary.payment_disputes_open ? '#f59e0b' : undefined },
            { label: 'Resolved', value: summary.resolved },
          ]}
        />
      )}
      <Section
        title="All complaints"
        right={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ ...input, width: 220 }} placeholder="Code, subject or booking" value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} />
            <select className="cranezo-select-dropdown" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
              <option value="active">Open and in review</option>
              <option value="open">Open</option>
              <option value="in_review">In review</option>
              <option value="closed">Closed</option>
              <option value="">All</option>
            </select>
          </div>
        )}
      >
        <Table
          headers={['Raised', 'Code', 'Type', 'Subject', 'Customer', 'Owner', 'Booking', 'Status']}
          rows={rows.map((c) => [
            when(c.created_at),
            <strong key="c">{c.complaint_code}</strong>,
            c.category_name,
            c.subject,
            c.customer ? c.customer.name : '-',
            c.owner ? c.owner.name : '-',
            c.booking ? c.booking.booking_code : '-',
            <Badge key="s" tone={STATUS_TONE[c.status]}>{c.status_label}</Badge>,
          ])}
          onRow={(i) => setOpenId(rows[i].id)}
          empty="No complaints here."
          minWidth={960}
        />
        <Pager page={page} size={SIZE} total={total} onPage={setPage} />
      </Section>
    </div>
  );
};

const ComplaintDetail = ({ id, onBack }) => {
  const [c, setC] = useState(null);
  const [form, setForm] = useState({ message: '', status: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/complaints/get', { method: 'POST', body: { complaint_id: id } });
      setC(res.data);
      setForm({ message: '', status: res.data.status });
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { complaint_id: id };
      if (form.message.trim()) body.message = form.message.trim();
      if (form.status && form.status !== c.status) body.status = form.status;
      const res = await apiRequest('/admin/complaints/update', { method: 'PUT', body });
      setC(res.data);
      setForm({ message: '', status: res.data.status });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cranezo-content-view animate-fade-in">
      <button type="button" className="cranezo-btn-secondary" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={15} /> Back to complaints
      </button>
      <ErrorBox message={error} />
      {c && (
        <>
          <PageHeader title={`${c.complaint_code}: ${c.subject}`} subtitle={`${c.category_name} · raised ${when(c.created_at)}`}>
            <Badge tone={STATUS_TONE[c.status]}>{c.status_label}</Badge>
          </PageHeader>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={card}>
              <div style={label}>Customer</div>
              <div>{c.customer ? c.customer.name : '-'}</div>
              <div style={muted}>{c.customer && c.customer.mobile_number ? `${c.customer.country_code || ''} ${c.customer.mobile_number}` : ''}</div>
            </div>
            <div style={card}>
              <div style={label}>Owner</div>
              <div>{c.owner ? c.owner.name : '-'}</div>
              <div style={muted}>{c.owner ? c.owner.member_id : ''}</div>
            </div>
            <div style={card}>
              <div style={label}>Booking</div>
              <div>{c.booking ? c.booking.booking_code : 'Not linked'}</div>
              <div style={muted}>
                {c.booking ? `${inr(c.booking.amount)} · payment ${c.booking.payment_status} (${c.booking.payment_method})` : ''}
              </div>
            </div>
          </div>

          <Section title="What the customer said">
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--dash-text-body)' }}>{c.description}</p>
            {c.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {c.attachments.map((a) => (
                  <a key={a} href={fileUrl(a)} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', fontSize: 13 }}>View attachment</a>
                ))}
              </div>
            )}
          </Section>

          <Section title="History">
            {c.updates.map((u) => (
              <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--dash-border-subtle)' }}>
                <div style={{ ...muted, fontSize: 12 }}>
                  {when(u.created_at)} · <strong>{u.author_name || u.author_type}</strong> ({u.author_type})
                  {u.status_to_label && <> · status: <strong>{u.status_to_label}</strong></>}
                </div>
                {u.message && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', color: 'var(--dash-text-body)' }}>{u.message}</div>}
              </div>
            ))}
          </Section>

          <Section title="Reply or change status">
            <label style={label}>Message to customer and owner</label>
            <textarea style={{ ...input, minHeight: 80 }} value={form.message} maxLength={2000} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <div>
                <label style={label}>Status</label>
                <select className="cranezo-select-dropdown" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
              <button type="button" className="cranezo-btn-primary-amber" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
              <span style={muted}>Closing a complaint needs a message explaining the outcome.</span>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export default Complaints;
