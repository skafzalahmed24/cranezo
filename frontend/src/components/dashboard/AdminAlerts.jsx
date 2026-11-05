import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Badge, ErrorBox, card, muted } from './financeUi';

/** Admin > Notifications: everything waiting for the admin, each one opens the page that fixes it */
export const AdminAlerts = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/alerts', { method: 'POST' });
      setData(res.data);
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

  const open = data ? data.items.filter((i) => i.count > 0) : [];
  const clear = data ? data.items.filter((i) => i.count === 0) : [];

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader title="Notifications" subtitle="Things waiting for you. Click one to open the page where you handle it." />
      <ErrorBox message={error} />
      {data && open.length === 0 && (
        <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <CheckCircle2 size={20} color="#22c55e" />
          <span style={{ color: 'var(--dash-text-title)' }}>All clear. Nothing is waiting for you.</span>
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {open.map((i) => (
          <div
            key={i.key}
            onClick={() => onNavigate(i.view)}
            style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <Badge tone={i.tone}>{i.count}</Badge>
            <span style={{ flex: 1, color: 'var(--dash-text-title)', fontWeight: 600 }}>{i.label}</span>
            <ChevronRight size={18} color="var(--dash-text-subtle)" />
          </div>
        ))}
      </div>
      {clear.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ ...muted, marginBottom: 8 }}>Nothing waiting:</div>
          {clear.map((i) => <div key={i.key} style={{ ...muted, padding: '3px 0' }}>✓ {i.label}</div>)}
        </div>
      )}
    </div>
  );
};

export default AdminAlerts;
