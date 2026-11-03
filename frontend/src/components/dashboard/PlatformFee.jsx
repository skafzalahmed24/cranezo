import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, ErrorBox, OkBox, input, label, muted, inr } from './financeUi';

const EXAMPLE = { hire: 2500, charges: 325, gst: 18 };

/** Admin > Platform Fee: the % the platform keeps from every job. Only the Super Admin can change it. */
export const PlatformFee = () => {
  const [current, setCurrent] = useState(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest('/admin/finance/settings', { method: 'POST' });
        setCurrent(res.data.platform_fee_percent);
        setValue(String(res.data.platform_fee_percent));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await apiRequest('/admin/finance/settings', { method: 'PUT', body: { platform_fee_percent: Number(value) } });
      setCurrent(res.data.platform_fee_percent);
      setNotice(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // live example so the effect of the % is obvious
  const pct = Number(value) || 0;
  const taxable = EXAMPLE.hire + EXAMPLE.charges;
  const gst = Math.round(taxable * EXAMPLE.gst) / 100;
  const total = taxable + gst;
  const fee = Math.round(taxable * pct) / 100;

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader title="Platform Fee" subtitle="The share the platform keeps from every completed job. It is taken from the job amount before GST." />
      <ErrorBox message={error} />
      <OkBox message={notice} />

      <Section title="Fee percentage">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 180 }}>
            <label style={label}>Platform fee (%)</label>
            <input type="number" min="0" max="50" step="0.25" style={input} value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <button type="button" className="cranzo-btn-primary-amber" disabled={saving || value === '' || Number(value) === current} onClick={save}>
            {saving ? 'Saving...' : 'Save fee'}
          </button>
          {current !== null && <span style={muted}>Current: {current}%</span>}
        </div>
        <p style={{ ...muted, marginTop: 12 }}>
          A new fee applies to jobs completed after you save. Completed jobs keep the fee they were completed with, so owners' past earnings never change.
          Only the Super Admin account can change this.
        </p>
      </Section>

      <Section title="Example with this fee">
        <table className="cranzo-table" style={{ maxWidth: 520 }}>
          <tbody>
            <tr><td>Crane hire</td><td style={{ textAlign: 'right' }}>{inr(EXAMPLE.hire)}</td></tr>
            <tr><td>Owner's additional charges</td><td style={{ textAlign: 'right' }}>{inr(EXAMPLE.charges)}</td></tr>
            <tr><td>GST ({EXAMPLE.gst}%)</td><td style={{ textAlign: 'right' }}>{inr(gst)}</td></tr>
            <tr><td><strong>Customer pays</strong></td><td style={{ textAlign: 'right' }}><strong>{inr(total)}</strong></td></tr>
            <tr><td>Platform fee ({pct}% of {inr(taxable)})</td><td style={{ textAlign: 'right', color: '#f59e0b' }}>{inr(fee)}</td></tr>
            <tr><td><strong>Owner receives</strong> (pays operator and GST from this)</td><td style={{ textAlign: 'right' }}><strong>{inr(total - fee)}</strong></td></tr>
          </tbody>
        </table>
      </Section>
    </div>
  );
};

export default PlatformFee;
