import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, ErrorBox, OkBox, input, label, muted, when } from './financeUi';

const EMPTY = { latest_version: '', min_supported_version: '', force_update: false, store_url: '', update_message: '' };

/** Admin > App Versions: force update for the Android app. Only the Super Admin can open and change it. */
export const AppVersions = () => {
  const [form, setForm] = useState(EMPTY);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/app-version/get', { method: 'POST', body: {} });
      const android = (res.data || []).find((r) => r.platform === 'android');
      if (android) {
        setForm({
          latest_version: android.latest_version || '',
          min_supported_version: android.min_supported_version || '',
          force_update: !!android.force_update,
          store_url: android.store_url || '',
          update_message: android.update_message || '',
        });
        setUpdatedAt(android.updated_at);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await apiRequest('/admin/app-version', { method: 'PUT', body: { platform: 'android', ...form } });
      setUpdatedAt(res.data.updated_at);
      setNotice('Saved. Apps pick this up the next time they open or come back from the background.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader
        title="App Versions"
        subtitle="Force update for the Android app. Use the version name of the app (for example 1.0.4), not the build number. Only the Super Admin can change this."
      />
      <ErrorBox message={error} />
      <OkBox message={notice} />

      <Section title="Android">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div>
            <label style={label}>Latest version</label>
            <input style={input} placeholder="1.0.5" value={form.latest_version} onChange={set('latest_version')} />
            <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>The newest version in the Play Store. Older apps are asked to update.</div>
          </div>
          <div>
            <label style={label}>Minimum supported version</label>
            <input style={input} placeholder="1.0.3" value={form.min_supported_version} onChange={set('min_supported_version')} />
            <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>Apps older than this are blocked until they update.</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.force_update} onChange={set('force_update')} />
              Force update (block every app older than the latest version, not only older than the minimum)
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Play Store link</label>
            <input style={input} placeholder="https://play.google.com/store/apps/details?id=com.cranezo" value={form.store_url} onChange={set('store_url')} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Message on the update screen</label>
            <input style={input} maxLength={300} placeholder="Please update to continue." value={form.update_message} onChange={set('update_message')} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" className="cranzo-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {updatedAt ? <span style={{ ...muted, fontSize: 12 }}>Last saved {when(updatedAt)}</span> : null}
        </div>
      </Section>
    </div>
  );
};

export default AppVersions;
