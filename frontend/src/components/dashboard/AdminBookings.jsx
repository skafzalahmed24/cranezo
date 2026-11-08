import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Table, Badge, ErrorBox, Pager, input, label, muted, card, inr, when } from './financeUi';

const SIZE = 20;
const STATUS_TONE = { 7: 'good', 4: 'bad', 2: 'bad', 3: 'bad', 8: 'warn', 0: 'warn' };
const FILTERS = [
  ['', 'All'], ['active', 'Active now'], ['8', 'Awaiting payment'], ['1', 'Confirmed'], ['5', 'En route'],
  ['6', 'In progress'], ['7', 'Completed'], ['4', 'Cancelled'],
];

/** Admin > Bookings: every booking with search and filters; click one for the full details */
export const AdminBookings = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const body = { min: page * SIZE, max: (page + 1) * SIZE };
      if (status) body.status = status;
      if (search.trim()) body.search = search.trim();
      const res = await apiRequest('/admin/bookings/list', { method: 'POST', body });
      setRows(res.data);
      setTotal(res.pagination ? res.pagination.total : res.data.length);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [page, status, search]);

  useEffect(() => {
    if (!openId) load();
  }, [load, openId]);

  if (openId) return <BookingDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader title="Bookings" subtitle="Every booking on the platform. Click a row for the bill, payments and timeline." />
      <ErrorBox message={error} />
      <Section
        title="All bookings"
        right={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ ...input, width: 240 }} placeholder="Booking code, customer, owner, place" value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} />
            <select className="cranezo-select-dropdown" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
              {FILTERS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
        )}
      >
        <Table
          headers={['Booked', 'Booking', 'Crane', 'Where', 'Customer', 'Owner', 'Operator', 'Total', 'Payment', 'Status']}
          rows={rows.map((b) => [
            when(b.created_at),
            <strong key="c">{b.booking_code}</strong>,
            b.crane_title,
            b.location,
            b.customer ? b.customer.name : '-',
            b.owner ? b.owner.name : '-',
            b.operator ? b.operator.name : <span key="o" style={muted}>Not assigned</span>,
            inr(b.total),
            b.payment_status,
            <Badge key="s" tone={STATUS_TONE[b.status] || 'warn'}>{b.status_label}</Badge>,
          ])}
          onRow={(i) => setOpenId(rows[i].booking_id)}
          empty="No bookings found."
          minWidth={1150}
        />
        <Pager page={page} size={SIZE} total={total} onPage={setPage} />
      </Section>
    </div>
  );
};

const Field = ({ name, value }) => (
  <div>
    <div style={label}>{name}</div>
    <div style={{ color: 'var(--dash-text-body)', fontSize: 14 }}>{value || '-'}</div>
  </div>
);

const BookingDetail = ({ id, onBack }) => {
  const [b, setB] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest('/admin/bookings/get', { method: 'POST', body: { booking_id: id } });
        setB(res.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [id]);
  return (
    <div className="cranezo-content-view animate-fade-in">
      <button type="button" className="cranezo-btn-secondary" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={15} /> Back to bookings
      </button>
      <ErrorBox message={error} />
      {b && (
        <>
          <PageHeader title={`${b.booking_code} · ${b.crane_title}`} subtitle={`${b.location} · ${when(b.start_at)} · ${b.duration_hours} hours`}>
            <Badge tone={STATUS_TONE[b.status] || 'warn'}>{b.status_label}</Badge>
          </PageHeader>
          <div style={{ ...card, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Field name="Customer" value={b.customer && `${b.customer.name} (${b.customer.contact})`} />
            <Field name="Owner" value={b.owner && `${b.owner.name} (${b.owner.contact})`} />
            <Field name="Operator" value={b.operator ? `${b.operator.name} (${b.operator.member_id})` : 'Not assigned'} />
            <Field name="Crane" value={b.crane_code} />
            <Field name="Site contact" value={b.site_contact && `${b.site_contact.name} (${b.site_contact.phone})`} />
            <Field name="Cancel reason" value={b.cancel_reason} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Section title="Bill">
              {b.bill.map((l) => (
                <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: l.total ? 700 : 400, borderTop: l.total ? '1px solid var(--dash-border-subtle)' : 'none', color: l.amount < 0 ? '#ef4444' : 'var(--dash-text-body)' }}>
                  <span>{l.label}</span>
                  <span>{l.amount < 0 ? `- ${inr(-l.amount)}` : inr(l.amount)}</span>
                </div>
              ))}
            </Section>
            <Section title="Timeline">
              {b.timeline.map((t) => (
                <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span>{t.label}</span>
                  <span style={muted}>{when(t.at)}</span>
                </div>
              ))}
              {b.rating && <div style={{ marginTop: 10 }}>Rating: {'★'.repeat(b.rating.rating)} {b.rating.comment ? `"${b.rating.comment}"` : ''}</div>}
            </Section>
          </div>
          <Section title="Payments">
            <Table
              headers={['When', 'Code', 'Kind', 'Method', 'Amount', 'Status', 'Razorpay payment', 'Note']}
              rows={b.payments.map((p) => [
                when(p.at), p.code, p.kind || '-', p.method, inr(p.amount),
                <Badge key="s" tone={p.status === 'success' ? 'good' : p.status === 'failed' ? 'bad' : 'warn'}>{p.status}</Badge>,
                p.gateway_payment_id || '-',
                p.needs_refund ? <strong key="r" style={{ color: '#ef4444' }}>Refund needed</strong> : (p.failure_reason || '-'),
              ])}
              empty="No payments yet."
              minWidth={900}
            />
          </Section>
        </>
      )}
    </div>
  );
};

export default AdminBookings;
