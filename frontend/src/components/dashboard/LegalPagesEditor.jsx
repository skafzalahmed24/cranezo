import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Save } from 'lucide-react';
import { apiRequest } from '../../utils/api';

const TABS = [
  { type: 'terms', label: 'Terms & Conditions' },
  { type: 'privacy', label: 'Privacy Policy' },
];

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--dash-input-bg)',
  border: '1px solid var(--dash-input-border)',
  borderRadius: '8px',
  color: 'var(--dash-text-body)',
  padding: '10px 12px',
  fontSize: '13px',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--dash-text-subtle)',
  margin: '0 0 6px',
};

const toDraft = (page) => ({
  title: page.title || '',
  intro: page.intro || '',
  last_updated: page.last_updated || '',
  sections: page.sections.map((s) => ({ title: s.title, subtitle: s.subtitle || '', body: s.body })),
});

/**
 * Admin > Legal Pages: edit the Terms & Conditions and Privacy Policy the apps show.
 * Saving replaces the whole page; the apps pick it up the next time the screen opens.
 */
export const LegalPagesEditor = () => {
  const [type, setType] = useState('terms');
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await apiRequest('/admin/legal/get', { method: 'POST', body: { type } });
      const next = toDraft(res.data);
      setOriginal(next);
      setDraft(next);
    } catch (err) {
      setError(err.message);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = draft && original && JSON.stringify(draft) !== JSON.stringify(original);

  const switchTab = (next) => {
    if (next === type) return;
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setType(next);
  };

  const setField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const setSection = (index, field, value) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));

  const moveSection = (index, direction) =>
    setDraft((d) => {
      const target = index + direction;
      if (target < 0 || target >= d.sections.length) return d;
      const sections = [...d.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...d, sections };
    });

  const removeSection = (index) => {
    if (!window.confirm(`Remove section ${index + 1}?`)) return;
    setDraft((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== index) }));
  };

  const addSection = () =>
    setDraft((d) => ({ ...d, sections: [...d.sections, { title: '', subtitle: '', body: '' }] }));

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const body = { title: draft.title, intro: draft.intro, sections: draft.sections };
      // only send the date when the admin picked a different one, otherwise the server stamps today
      if (draft.last_updated !== original.last_updated) body.last_updated = draft.last_updated;
      const res = await apiRequest(`/admin/legal/${type}`, { method: 'PUT', body });
      const saved = toDraft(res.data);
      setOriginal(saved);
      setDraft(saved);
      setNotice('Saved. The apps will show the new text the next time the screen is opened.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const card = {
    background: 'var(--dash-card)',
    border: '1px solid var(--dash-border)',
    borderRadius: '12px',
    padding: '18px 20px',
    marginBottom: '16px',
  };

  return (
    <div className="cranezo-content-view animate-fade-in">
      <div className="cranezo-users-header-row">
        <div>
          <h2 className="cranezo-greeting-title">Legal Pages</h2>
          <p className="cranezo-greeting-subtitle">
            Edit the Terms &amp; Conditions and Privacy Policy shown in the Cranezo apps.
          </p>
        </div>
        <div className="cranezo-header-actions-group">
          <button type="button" className="cranezo-btn-primary-amber" disabled={!dirty || saving} onClick={save}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            className={type === tab.type ? 'cranezo-btn-primary-amber' : 'cranezo-btn-secondary'}
            onClick={() => switchTab(tab.type)}
          >
            {tab.label}
          </button>
        ))}
        {dirty && <span style={{ alignSelf: 'center', color: '#f59e0b', fontSize: '12px' }}>Unsaved changes</span>}
      </div>

      {error && <div style={{ ...card, color: '#ef4444', padding: '12px 16px' }}>{error}</div>}
      {notice && <div style={{ ...card, color: '#10b981', padding: '12px 16px' }}>{notice}</div>}
      {loading && !draft && <p style={{ color: 'var(--dash-text-muted)' }}>Loading...</p>}

      {draft && (
        <>
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Page title</label>
                <input style={inputStyle} value={draft.title} onChange={(e) => setField('title', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Last updated (shown in the app)</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={draft.last_updated}
                  onChange={(e) => setField('last_updated', e.target.value)}
                />
                <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)', marginTop: '4px' }}>
                  Leave as is and today's date is set automatically when you save.
                </div>
              </div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <label style={labelStyle}>Introduction (top card)</label>
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={draft.intro}
                onChange={(e) => setField('intro', e.target.value)}
              />
            </div>
          </div>

          {draft.sections.map((section, index) => (
            <div key={index} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <strong style={{ color: 'var(--dash-text-title)' }}>Section {index + 1}</strong>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                  <button type="button" className="cranezo-action-btn" title="Move up" disabled={index === 0} onClick={() => moveSection(index, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="cranezo-action-btn"
                    title="Move down"
                    disabled={index === draft.sections.length - 1}
                    onClick={() => moveSection(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="cranezo-action-btn" title="Remove section" onClick={() => removeSection(index)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input style={inputStyle} value={section.title} onChange={(e) => setSection(index, 'title', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Subtitle (optional, shown on the Privacy list)</label>
                  <input style={inputStyle} value={section.subtitle} onChange={(e) => setSection(index, 'subtitle', e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <label style={labelStyle}>Text</label>
                <textarea
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  value={section.body}
                  onChange={(e) => setSection(index, 'body', e.target.value)}
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button type="button" className="cranezo-btn-secondary" onClick={addSection}>
              <Plus size={15} /> Add section
            </button>
            <button type="button" className="cranezo-btn-primary-amber" disabled={!dirty || saving} onClick={save}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LegalPagesEditor;
