import React, { useCallback, useEffect, useState } from 'react';
import { Users, Briefcase, HardHat, Construction, Calendar, Wallet, Percent, Search } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Table, Badge, ErrorBox, card, muted, inr, when } from './financeUi';

const STATUS_TONE = { 7: 'good', 4: 'bad', 2: 'bad', 3: 'bad', 8: 'warn', 0: 'warn' };

/** Small bar chart drawn with plain divs (no chart library) */
const Bars = ({ points, value, format }) => {
  const max = Math.max(1, ...points.map(value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, padding: '8px 4px 0' }}>
      {points.map((p) => (
        <div key={p.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--dash-text-muted)' }}>{format(value(p))}</div>
          <div style={{ width: '100%', maxWidth: 36, height: `${Math.max(4, (value(p) / max) * 110)}px`, borderRadius: 6, background: 'linear-gradient(180deg,#ffb300,#f59e0b)' }} />
          <div style={{ fontSize: 11, color: 'var(--dash-text-subtle)' }}>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
        </div>
      ))}
    </div>
  );
};

/** Admin > Dashboard: live numbers from the database */
export const AdminDashboard = ({ onNavigate }) => {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/dashboard', { method: 'POST' });
      setD(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const tiles = d ? [
    { label: 'Customers', value: d.users.customers, icon: Users, view: 'users' },
    { label: 'Crane owners', value: d.users.owners, icon: Briefcase, view: 'owners' },
    { label: 'Operators', value: d.users.operators, icon: HardHat, view: 'operators' },
    { label: 'Cranes (verified)', value: `${d.cranes.verified} / ${d.cranes.total}`, hint: `${d.cranes.under_review} waiting for approval`, icon: Construction, view: d.cranes.under_review ? 'crane-approvals' : 'cranes' },
    { label: 'Active bookings', value: d.bookings.active, hint: `${d.bookings.today} new today`, icon: Calendar, view: 'bookings' },
    { label: 'Collected', value: inr(d.money.collected), hint: `${inr(d.money.collected_today)} today`, icon: Wallet, view: 'payments' },
    { label: 'Platform fee earned', value: inr(d.money.platform_fee), icon: Percent, view: 'settlements' },
    { label: 'Requests searching', value: d.requests.searching, hint: `${d.requests.no_crane_found} "no crane found" to call`, icon: Search, view: 'crane-requests' },
  ] : [];

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Live numbers. Refreshes every minute." />
      <ErrorBox message={error} />
      {d && d.alerts > 0 && (
        <div
          style={{ ...card, marginBottom: 16, borderColor: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => onNavigate('notifications')}
        >
          <span style={{ color: 'var(--dash-text-title)', fontWeight: 600 }}>{d.alerts} item(s) need your attention</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Open alerts →</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} style={{ ...card, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', minHeight: 72 }} onClick={() => onNavigate(t.view)}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color="#f59e0b" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--dash-text-subtle)' }}>{t.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--dash-text-title)' }}>{t.value}</div>
                {t.hint && <div style={{ ...muted, fontSize: 11 }}>{t.hint}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {d && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <Section title="Bookings - last 7 days">
            <Bars points={d.last_7_days} value={(p) => p.bookings} format={(v) => v} />
          </Section>
          <Section title="Money collected - last 7 days">
            <Bars points={d.last_7_days} value={(p) => p.revenue} format={(v) => (v ? inr(v) : '')} />
          </Section>
        </div>
      )}
      {d && (
        <Section title="Latest bookings" right={<button type="button" className="cranzo-btn-secondary" onClick={() => onNavigate('bookings')}>View all</button>}>
          <Table
            headers={['Booked', 'Booking', 'Crane', 'Customer', 'Owner', 'Total', 'Status']}
            rows={d.recent_bookings.map((b) => [
              when(b.created_at),
              <strong key="c">{b.booking_code}</strong>,
              b.crane_title,
              b.customer ? b.customer.name : '-',
              b.owner ? b.owner.name : '-',
              inr(b.total),
              <Badge key="s" tone={STATUS_TONE[b.status] || 'warn'}>{b.status_label}</Badge>,
            ])}
            empty="No bookings yet."
            minWidth={820}
          />
        </Section>
      )}
    </div>
  );
};

export default AdminDashboard;
