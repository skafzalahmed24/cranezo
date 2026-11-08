import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, ErrorBox, OkBox, input, label, muted } from './financeUi';

const RULES = [
  ['search_radius_km', 'Search radius (km)', 'Owners this far from the site get the request'],
  ['free_km', 'Free distance (km)', 'No distance charge up to this distance'],
  ['min_per_km_rate', 'Minimum ₹ per km', 'Owners cannot set a lower ₹/km'],
  ['request_minutes', 'Request time (minutes)', 'After this, an unanswered request expires'],
  ['raise_after_minutes', 'Raise price after (minutes)', 'When the "Raise price" button appears'],
  ['raise_step_percent', 'Raise step (%)', 'Each raise adds this % of the offer'],
  ['raise_min_step', 'Smallest raise (₹)', 'A raise is never smaller than this'],
  ['payment_window_minutes', 'Time to pay advance (minutes)', 'Unpaid bookings are cancelled after this'],
  ['gateway_fee_percent', 'Online payment fee (%)', 'Razorpay fee added to the customer bill (owner amount unchanged)'],
  ['arrival_radius_km', 'Arrival distance (km)', 'Operator can mark "arrived" only this close to the site'],
];

/** Admin > Pricing Rules: booking request rules and the minimum hourly price per crane type and capacity */
export const PricingRules = () => {
  const [data, setData] = useState(null);
  const [rules, setRules] = useState({});
  const [mins, setMins] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/pricing', { method: 'POST' });
      setData(res.data);
      setRules(Object.fromEntries(Object.entries(res.data.rules).map(([k, v]) => [k, String(v)])));
      setMins(Object.fromEntries(res.data.minimums.map((m) => [`${m.crane_type}:${m.capacity}`, String(m.min_hourly_rate)])));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveRules = () => run(async () => {
    const body = Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, Number(v)]));
    const res = await apiRequest('/admin/pricing/rules', { method: 'PUT', body });
    setRules(Object.fromEntries(Object.entries(res.data.rules).map(([k, v]) => [k, String(v)])));
  }, 'Booking rules saved. New requests use them.');

  const saveMinimum = (t, c) => run(async () => {
    const v = mins[`${t}:${c}`];
    await apiRequest('/admin/pricing/minimum', { method: 'PUT', body: { crane_type: t, capacity: c, min_hourly_rate: Number(v || 0) } });
  }, 'Minimum price saved.');

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader
        title="Pricing Rules"
        subtitle="Minimum prices and how booking requests behave. Owners set their own rates but never below these minimums. Only the Super Admin can change them."
      />
      <ErrorBox message={error} />
      <OkBox message={notice} />

      <Section title="Booking request rules">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {RULES.map(([key, title, hint]) => (
            <div key={key}>
              <label style={label}>{title}</label>
              <input type="number" min="0" style={input} value={rules[key] ?? ''} onChange={(e) => setRules({ ...rules, [key]: e.target.value })} />
              <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </div>
        <button type="button" className="cranzo-btn-primary-amber" style={{ marginTop: 14 }} onClick={saveRules}>Save rules</button>
      </Section>

      <Section title="Minimum crane hire per hour (₹)">
        <p style={{ ...muted, marginTop: 0 }}>
          The customer's first offer starts at this price x hours. Leave 0 when there is no minimum (the cheapest nearby crane is used instead).
        </p>
        {data && (
          <div className="cranzo-table-container">
            <table className="cranzo-table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Crane type</th>
                  <th>Capacity</th>
                  <th>Minimum ₹ / hour</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.crane_types.flatMap((t) => data.capacities.map((c) => {
                  const key = `${t.id}:${c.id}`;
                  return (
                    <tr key={key}>
                      <td>{t.name}</td>
                      <td>{c.name}</td>
                      <td style={{ width: 180 }}>
                        <input type="number" min="0" style={input} value={mins[key] ?? ''} placeholder="0"
                          onChange={(e) => setMins({ ...mins, [key]: e.target.value })} />
                      </td>
                      <td style={{ width: 90 }}>
                        <button type="button" className="cranzo-btn-secondary" onClick={() => saveMinimum(t.id, c.id)}>Save</button>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
};

export default PricingRules;
