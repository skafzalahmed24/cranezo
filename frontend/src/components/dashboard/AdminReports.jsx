import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, ErrorBox, inr } from './financeUi';

const monthName = (k) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

/** Admin > Reports: month-by-month business numbers */
export const AdminReports = () => {
  const [months, setMonths] = useState(6);
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/reports', { method: 'POST', body: { months } });
      setR(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  const max = r ? Math.max(1, ...r.monthly.map((m) => m.gross)) : 1;

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader title="Reports" subtitle="Bookings, money and crane requests by month (India time).">
        <select className="cranezo-select-dropdown" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {[3, 6, 12, 24].map((m) => <option key={m} value={m}>Last {m} months</option>)}
        </select>
      </PageHeader>
      <ErrorBox message={error} />
      {r && (
        <>
          <Stats
            items={[
              { label: 'Bookings made', value: r.totals.bookings },
              { label: 'Jobs completed', value: r.totals.completed },
              { label: 'Cancelled / declined / expired', value: r.totals.cancelled },
              { label: 'Job value (completed)', value: inr(r.totals.gross) },
              { label: 'Platform fee earned', value: inr(r.totals.platform_fee) },
              { label: 'Request acceptance', value: r.requests.acceptance_rate !== null ? `${r.requests.acceptance_rate}%` : '-' },
              { label: '"No crane found"', value: r.requests.no_crane_found },
            ]}
          />
          <Section title="By month">
            <Table
              headers={['Month', 'Bookings', 'Completed', 'Job value', 'Platform fee', '']}
              rows={r.monthly.map((m) => [
                monthName(m.month),
                m.bookings,
                m.completed,
                inr(m.gross),
                inr(m.platform_fee),
                <div key="bar" style={{ width: 160, height: 8, borderRadius: 4, background: 'var(--dash-border-subtle)' }}>
                  <div style={{ width: `${(m.gross / max) * 100}%`, height: '100%', borderRadius: 4, background: '#f59e0b' }} />
                </div>,
              ])}
              minWidth={720}
            />
          </Section>
          <Section title="Top crane owners (by completed job value)">
            <Table
              headers={['Owner', 'Phone', 'Jobs', 'Job value', 'Platform fee']}
              rows={r.top_owners.map((o) => [
                o.owner ? o.owner.name : '-',
                o.owner ? o.owner.contact : '-',
                o.jobs,
                inr(o.gross),
                inr(o.platform_fee),
              ])}
              empty="No completed jobs in this period."
            />
          </Section>
        </>
      )}
    </div>
  );
};

export default AdminReports;
