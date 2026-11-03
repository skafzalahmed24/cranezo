import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';
import ImageUpload from './ImageUpload';

const card = { background: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 18px' };
const input = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--dash-input-bg)',
  border: '1px solid var(--dash-input-border)',
  borderRadius: '8px',
  color: 'var(--dash-text-body)',
  padding: '9px 12px',
  fontSize: '13px',
  fontFamily: 'inherit',
};
const label = { display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--dash-text-subtle)', margin: '0 0 6px' };

const AUDIENCES = [['all', 'Everyone'], ['customer', 'Customers'], ['operator', 'Operators'], ['owner', 'Crane owners']];
const ACTIONS = [['none', 'Nothing (only shows the banner)'], ['book_crane', 'Open Book a Crane'], ['screen', 'Open an app screen'], ['url', 'Open a web link']];
const SCREENS = [['my_jobs', 'My Jobs'], ['track', 'Track My Crane'], ['support', 'Help & Support'], ['notifications', 'Notifications'], ['profile', 'Profile'], ['earnings', 'Earnings']];

// <input type="datetime-local"> works in local time, the API stores ISO
const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toIso = (local) => (local ? new Date(local).toISOString() : null);

const emptyForm = { image: '', title: '', subtitle: '', button_text: '', audience: 'all', action_type: 'none', action_value: '', starts_at: '', ends_at: '', is_active: true };

const describeAction = (a) => {
  if (a.type === 'book_crane') return 'Opens Book a Crane';
  if (a.type === 'screen') return `Opens ${(SCREENS.find(([id]) => id === a.value) || [])[1] || a.value}`;
  if (a.type === 'url') return `Opens ${a.value}`;
  return 'No action';
};

/** Admin > Banners: the carousel on the app home screen. Add, edit, schedule, reorder or hide (no delete). */
export const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(null); // null | { id?, ...fields }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/banners/list', { method: 'POST', body: { min: 0, max: 100 } });
      setBanners(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        image: form.image,
        title: form.title,
        subtitle: form.subtitle,
        button_text: form.button_text,
        audience: form.audience,
        action_type: form.action_type,
        action_value: form.action_type === 'screen' || form.action_type === 'url' ? form.action_value : '',
        starts_at: toIso(form.starts_at),
        ends_at: toIso(form.ends_at),
        is_active: form.is_active,
      };
      if (form.id) await apiRequest(`/admin/banners/${form.id}`, { method: 'PUT', body });
      else await apiRequest('/admin/banners', { method: 'POST', body });
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (b) =>
    setForm({
      id: b.id,
      image: b.image,
      title: b.title || '',
      subtitle: b.subtitle || '',
      button_text: b.button_text || '',
      audience: b.audience,
      action_type: b.action.type,
      action_value: b.action.value || '',
      starts_at: toLocal(b.starts_at),
      ends_at: toLocal(b.ends_at),
      is_active: b.is_active,
    });

  // swap the order of two neighbours
  const move = (index, direction) => {
    const a = banners[index];
    const b = banners[index + direction];
    if (!b) return;
    run(async () => {
      // give both a clear position so equal numbers cannot block the swap
      await apiRequest(`/admin/banners/${a.id}`, { method: 'PUT', body: { sort_order: index + direction } });
      await apiRequest(`/admin/banners/${b.id}`, { method: 'PUT', body: { sort_order: index } });
    });
  };

  const set = (patch) => setForm({ ...form, ...patch });

  return (
    <div className="cranzo-content-view animate-fade-in">
      <div className="cranzo-users-header-row">
        <div>
          <h2 className="cranzo-greeting-title">Banners</h2>
          <p className="cranzo-greeting-subtitle">The banners shown on the app home screen. Choose who sees them, when, and what a tap does.</p>
        </div>
        <div className="cranzo-header-actions-group">
          <button type="button" className="cranzo-btn-primary-amber" onClick={() => setForm({ ...emptyForm })}>
            <Plus size={15} /> Add banner
          </button>
        </div>
      </div>

      {error && <div style={{ ...card, color: '#ef4444', marginBottom: 12 }}>{error}</div>}

      {form && (
        <div style={{ ...card, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 14px', color: 'var(--dash-text-title)' }}>{form.id ? `Edit banner #${form.id}` : 'New banner'}</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <label style={label}>Banner image *</label>
              <ImageUpload value={form.image} onChange={(image) => set({ image })} width={280} height={140} label="Upload banner image" />
              <div style={{ fontSize: 11, color: 'var(--dash-text-subtle)', marginTop: 6, maxWidth: 280 }}>
                Use a wide image (about 2:1). If the text is already part of the image, leave title and button empty.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <label style={label}>Title (drawn over the image, optional)</label>
              <input style={{ ...input, marginBottom: 12 }} value={form.title} maxLength={150} onChange={(e) => set({ title: e.target.value })} />
              <label style={label}>Subtitle (optional)</label>
              <input style={{ ...input, marginBottom: 12 }} value={form.subtitle} maxLength={255} onChange={(e) => set({ subtitle: e.target.value })} />
              <label style={label}>Button text (optional)</label>
              <input style={input} value={form.button_text} maxLength={40} onChange={(e) => set({ button_text: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
            <div>
              <label style={label}>Who sees it</label>
              <select className="cranzo-select-dropdown" style={{ width: '100%' }} value={form.audience} onChange={(e) => set({ audience: e.target.value })}>
                {AUDIENCES.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>When tapped</label>
              <select className="cranzo-select-dropdown" style={{ width: '100%' }} value={form.action_type} onChange={(e) => set({ action_type: e.target.value, action_value: '' })}>
                {ACTIONS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
              </select>
            </div>
            {form.action_type === 'screen' && (
              <div>
                <label style={label}>Screen</label>
                <select className="cranzo-select-dropdown" style={{ width: '100%' }} value={form.action_value} onChange={(e) => set({ action_value: e.target.value })}>
                  <option value="">Choose a screen</option>
                  {SCREENS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
                </select>
              </div>
            )}
            {form.action_type === 'url' && (
              <div>
                <label style={label}>Link (https)</label>
                <input style={input} placeholder="https://..." value={form.action_value} onChange={(e) => set({ action_value: e.target.value })} />
              </div>
            )}
            <div>
              <label style={label}>Show from (optional)</label>
              <input type="datetime-local" style={input} value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
            </div>
            <div>
              <label style={label}>Show until (optional)</label>
              <input type="datetime-local" style={input} value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--dash-text-body)', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> Visible in the apps
            </label>
            <button type="button" className="cranzo-btn-primary-amber" style={{ marginLeft: 'auto' }} disabled={saving || !form.image} onClick={save}>
              {saving ? 'Saving...' : 'Save banner'}
            </button>
            <button type="button" className="cranzo-btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {banners.map((b, index) => (
        <div key={b.id} style={{ ...card, marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', opacity: b.is_active ? 1 : 0.6 }}>
          <img src={fileUrl(b.image)} alt="" style={{ width: 200, height: 100, objectFit: 'cover', borderRadius: 8, background: 'var(--dash-input-bg)' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--dash-text-title)' }}>{b.title || '(image only)'}</strong>
              <span className={`cranzo-status-badge ${b.is_live ? 'active' : b.is_active ? 'pending' : 'blocked'}`}>
                {b.is_live ? 'Live' : b.is_active ? 'Scheduled / ended' : 'Hidden'}
              </span>
            </div>
            {b.subtitle && <div style={{ fontSize: 13, color: 'var(--dash-text-body)', marginTop: 2 }}>{b.subtitle}</div>}
            <div style={{ fontSize: 12, color: 'var(--dash-text-subtle)', marginTop: 6 }}>
              {(AUDIENCES.find(([id]) => id === b.audience) || [])[1]} · {describeAction(b.action)}
              {b.starts_at && ` · from ${new Date(b.starts_at).toLocaleString('en-IN')}`}
              {b.ends_at && ` · until ${new Date(b.ends_at).toLocaleString('en-IN')}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="cranzo-action-btn" title="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
            <button type="button" className="cranzo-action-btn" title="Move down" disabled={index === banners.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
            <button type="button" className="cranzo-action-btn" title="Edit" onClick={() => edit(b)}><Pencil size={15} /></button>
            <button
              type="button"
              className="cranzo-action-btn"
              title={b.is_active ? 'Hide' : 'Show'}
              onClick={() => run(() => apiRequest(`/admin/banners/${b.id}`, { method: 'PUT', body: { is_active: !b.is_active } }))}
            >
              {b.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      ))}
      {banners.length === 0 && !form && <p style={{ color: 'var(--dash-text-muted)' }}>No banners yet. Add the first one.</p>}
    </div>
  );
};

export default Banners;
