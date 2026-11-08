import React, { useCallback, useEffect, useState } from 'react';
import { Users, Briefcase, HardHat, Construction, Calendar, Wallet, Percent, Search, CalendarDays, ChevronRight, FileCheck2 } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { Table, Badge, ErrorBox, inr, when } from './financeUi';

const STATUS_TONE = { 7: 'good', 4: 'bad', 2: 'bad', 3: 'bad', 8: 'warn', 0: 'warn' };
const DONUT_COLORS = ['#f59e0b', '#3b82f6', '#06b6d4', '#a855f7', '#64748b'];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const short = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K` : `${n}`);
const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
/** a round top value for the chart (10, 20, 50, 100 ...) so the grid lines look tidy */
const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
};

const GRID = [20, 55, 90, 125, 160];

/** Bar chart (bookings) and area chart (money), drawn as SVG so no chart library is needed */
const Chart = ({ points, value, kind, format }) => {
  const max = niceMax(Math.max(...points.map(value), 1));
  const ticks = GRID.map((y, i) => ({ y, label: format((max * (4 - i)) / 4) }));
  const xs = points.map((_, i) => (points.length === 1 ? 250 : 50 + (i * 420) / (points.length - 1)));
  const ys = points.map((p) => 160 - (value(p) / max) * 140);
  const line = xs.reduce((acc, x, i) => (i === 0 ? `M ${x} ${ys[i]}` : `${acc} C ${(xs[i - 1] + x) / 2} ${ys[i - 1]}, ${(xs[i - 1] + x) / 2} ${ys[i]}, ${x} ${ys[i]}`), '');
  return (
    <div className="cranezo-chart-wrapper">
      <svg className="cranezo-chart-svg" viewBox="0 0 500 180" preserveAspectRatio="none">
        {kind === 'area' && (
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
        )}
        {ticks.map((t) => (
          <g key={t.y}>
            <text x="25" y={t.y + 3} textAnchor="end" className="cranezo-chart-axis-label">{t.label}</text>
            <line x1="35" y1={t.y} x2="480" y2={t.y} className="cranezo-chart-grid-line" />
          </g>
        ))}
        {kind === 'bar' && points.map((p, i) => {
          const slot = 435 / points.length;
          const w = Math.min(18, slot * 0.5);
          const x = 45 + i * slot + (slot - w) / 2;
          const h = (value(p) / max) * 140;
          return (
            <g key={p.date}>
              <rect x={x} y={160 - h} width={w} height={Math.max(h, 1)} className="cranezo-chart-bar"><title>{`${dayLabel(p.date)}: ${format(value(p))}`}</title></rect>
              <text x={x + w / 2} y="176" textAnchor="middle" className="cranezo-chart-axis-label">{dayLabel(p.date)}</text>
            </g>
          );
        })}
        {kind === 'area' && (
          <g>
            <path d={`${line} L ${xs[xs.length - 1]} 160 L ${xs[0]} 160 Z`} fill="url(#revGrad)" />
            <path d={line} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
            {points.map((p, i) => (
              <g key={p.date}>
                <circle cx={xs[i]} cy={ys[i]} r="4" className="cranezo-chart-dot"><title>{`${dayLabel(p.date)}: ${inr(value(p))}`}</title></circle>
                <text x={xs[i]} y="176" textAnchor="middle" className="cranezo-chart-axis-label">{dayLabel(p.date)}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};

/** Donut: share of verified cranes by type */
const Donut = ({ items }) => {
  const total = items.reduce((s, i) => s + i.count, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--dash-border-subtle)" strokeWidth="16" />
        {total > 0 && items.map((it, i) => {
          const len = (it.count / total) * C;
          const el = (
            <circle key={it.name} cx="70" cy="70" r={R} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--dash-text-title)">{total}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="var(--dash-text-subtle)">Total Cranes</text>
      </svg>
      <div style={{ flex: 1, minWidth: 160, display: 'grid', gap: 8 }}>
        {items.length === 0 && <span style={{ color: 'var(--dash-text-muted)', fontSize: 13 }}>No verified cranes yet.</span>}
        {items.map((it, i) => (
          <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--dash-text-body)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{it.name}</span>
            <strong style={{ color: 'var(--dash-text-title)' }}>{Math.round((it.count / total) * 100)}%</strong>
          </div>
        ))}
      </div>
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
    { label: 'Total Users', value: d.users.customers, icon: Users, view: 'users' },
    { label: 'Total Owners', value: d.users.owners, icon: Briefcase, view: 'owners' },
    { label: 'Active Cranes', value: d.cranes.verified, hint: `of ${d.cranes.total}`, icon: Construction, view: 'cranes' },
    { label: 'Active Bookings', value: d.bookings.active, hint: `${d.bookings.today} today`, icon: Calendar, view: 'bookings' },
    { label: 'Total Revenue', value: inr(d.money.collected), hint: `${inr(d.money.collected_today)} today`, icon: Wallet, view: 'payments' },
    { label: 'Completed Jobs', value: d.bookings.completed, icon: FileCheck2, view: 'bookings' },
    { label: 'Platform Fee', value: inr(d.money.platform_fee), icon: Percent, view: 'settlements' },
    { label: 'Active Operators', value: d.users.operators, icon: HardHat, view: 'operators' },
  ] : [];

  const approvals = d ? [
    { label: 'Cranes', n: d.pending_approvals.cranes, icon: Construction, view: 'crane-approvals' },
    { label: 'Operators', n: d.pending_approvals.operators, icon: HardHat, view: 'operators' },
    { label: 'Crane requests', n: d.pending_approvals.crane_requests, icon: Search, view: 'crane-requests' },
  ] : [];

  return (
    <div className="cranezo-content-view animate-fade-in">
      <div className="cranezo-top-greeting-row">
        <div>
          <h2 className="cranezo-greeting-title">{greeting()}, Admin <span role="img" aria-label="wave">👋</span></h2>
          <p className="cranezo-greeting-subtitle">Here's what's happening across Cranezo today. Refreshes every minute.</p>
        </div>
        <div className="cranezo-date-pill">
          <CalendarDays size={16} color="#f59e0b" />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      <ErrorBox message={error} />
      {d && d.alerts > 0 && (
        <div className="cranezo-card" style={{ marginBottom: 16, borderColor: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => onNavigate('notifications')}>
          <span style={{ color: 'var(--dash-text-title)', fontWeight: 600 }}>{d.alerts} item(s) need your attention</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Open alerts →</span>
        </div>
      )}

      <div className="cranezo-stats-grid-8">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="cranezo-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate(t.view)}>
              <div className="cranezo-stat-card-left">
                <div className="cranezo-stat-icon-box"><Icon size={20} /></div>
                <div className="cranezo-stat-info">
                  <span className="cranezo-stat-label">{t.label}</span>
                  <span className="cranezo-stat-value">{t.value}</span>
                </div>
              </div>
              {t.hint && <span className="cranezo-trend-pill up">{t.hint}</span>}
            </div>
          );
        })}
      </div>

      {d && (
        <div className="cranezo-charts-row">
          <div className="cranezo-card">
            <div className="cranezo-card-header">
              <h3 className="cranezo-card-title">Booking Overview</h3>
              <div className="cranezo-filter-pills-group"><button type="button" className="cranezo-filter-pill-btn active">Last 7 days</button></div>
            </div>
            <Chart points={d.last_7_days} value={(p) => p.bookings} kind="bar" format={(v) => `${Math.round(v)}`} />
          </div>
          <div className="cranezo-card">
            <div className="cranezo-card-header">
              <h3 className="cranezo-card-title">Revenue Overview</h3>
              <div className="cranezo-filter-pills-group"><button type="button" className="cranezo-filter-pill-btn active">Last 7 days</button></div>
            </div>
            <Chart points={d.last_7_days} value={(p) => p.revenue} kind="area" format={(v) => short(Math.round(v))} />
          </div>
        </div>
      )}

      {d && (
        <div className="cranezo-card" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16 }}>
          <div className="cranezo-card-header">
            <h3 className="cranezo-card-title">Recent Bookings</h3>
            <button type="button" className="cranezo-action-link" onClick={() => onNavigate('bookings')}>View All</button>
          </div>
          <Table
            headers={['Booking', 'Customer', 'Crane', 'Owner', 'Booked', 'Amount', 'Status']}
            rows={d.recent_bookings.map((b) => [
              <strong key="c" className="cranezo-booking-id">{b.booking_code}</strong>,
              b.customer ? b.customer.name : '-',
              b.crane_title,
              b.owner ? b.owner.name : '-',
              when(b.created_at),
              inr(b.total),
              <Badge key="s" tone={STATUS_TONE[b.status] || 'warn'}>{b.status_label}</Badge>,
            ])}
            empty="No bookings yet."
            minWidth={820}
          />
        </div>
      )}

      {d && (
        <div className="cranezo-charts-row">
          <div className="cranezo-card">
            <div className="cranezo-card-header"><h3 className="cranezo-card-title">Pending Approvals</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
              {approvals.map((a) => {
                const Icon = a.icon;
                return (
                  <div key={a.label} style={{ border: '1px solid var(--dash-border)', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="cranezo-stat-icon-box" style={{ width: 30, height: 30 }}><Icon size={15} /></div>
                      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--dash-text-title)' }}>{a.n}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--dash-text-subtle)' }}>{a.label}</span>
                    <button type="button" className="cranezo-btn-secondary" style={{ justifyContent: 'center' }} onClick={() => onNavigate(a.view)}>
                      Review <ChevronRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="cranezo-card">
            <div className="cranezo-card-header"><h3 className="cranezo-card-title">Crane Distribution</h3></div>
            <Donut items={d.crane_types} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
