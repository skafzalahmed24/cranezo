import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Table, ErrorBox, OkBox, card, input, label, muted } from './financeUi';

/**
 * Admin > Clear Database (the page at /admin/clear-data).
 * Deletes every account and everything they created, and keeps the static data and settings.
 * Only the Super Admin can open it, the server must have ALLOW_DB_CLEAR=true, and the database name must be typed.
 */
export const ClearDatabase = () => {
  const [preview, setPreview] = useState(null);
  const [typed, setTyped] = useState('');
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await apiRequest('/admin/db-clear/preview', { method: 'POST', body: {} });
      setPreview(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const matches = preview && typed.trim() === preview.database;
  const canClear = preview && preview.enabled && matches && !busy;

  const clear = async () => {
    if (!canClear) return;
    if (!window.confirm(`Delete all accounts and bookings from "${preview.database}"? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest('/admin/db-clear', { method: 'POST', body: { confirm: typed.trim(), delete_files: deleteFiles } });
      setDone(res.data);
      setTyped('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader
        title="Clear Database"
        subtitle="Deletes every user, crane, booking, payment, complaint and notification, and starts the ids again from 1. Admins, roles, dropdowns, FAQs, legal pages, fees and other settings stay. Only the Super Admin can use this."
      />
      <ErrorBox message={error} />
      {done ? (
        <OkBox message={`Done. ${done.rows_deleted} rows deleted from ${done.tables_cleared} tables${done.files_deleted ? `, ${done.files_deleted} uploaded files deleted` : ''}. Static data was kept. Restart the server (pm2 restart cranezo-backend) so nothing old stays in memory.`} />
      ) : null}

      {preview && !preview.enabled ? (
        <div style={{ ...card, marginBottom: 12, borderColor: '#f59e0b' }}>
          <strong>Switched off on this server.</strong>
          <div style={{ ...muted, marginTop: 4 }}>
            To allow it, add <code>ALLOW_DB_CLEAR=true</code> to the server <code>.env</code> and restart. Or use the command on the server: <code>npm run db:clear</code>.
            Switch it off again when you are done.
          </div>
        </div>
      ) : null}

      {preview ? (
        <>
          <Section title={`Will be deleted (${preview.total_rows_to_delete} rows)`}>
            <Table
              headers={['Table', 'Rows']}
              rows={preview.clear.map((t) => [t.table, t.rows])}
              empty="Nothing to delete."
              minWidth={320}
            />
          </Section>

          <Section title="Kept (static data and settings)">
            <Table
              headers={['Table', 'Rows']}
              rows={preview.keep.map((t) => [t.table, t.rows])}
              empty="-"
              minWidth={320}
            />
            {preview.unclassified.length ? (
              <div style={{ ...muted, marginTop: 8 }}>Not touched (not in either list): {preview.unclassified.join(', ')}</div>
            ) : null}
          </Section>

          <Section title="Clear it">
            <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
              <input type="checkbox" checked={deleteFiles} onChange={(e) => setDeleteFiles(e.target.checked)} />
              Also delete the uploaded photos and documents ({preview.uploaded_files} files)
            </label>
            <div style={{ marginTop: 14, maxWidth: 420 }}>
              <label style={label}>Type the database name to confirm: {preview.database}</label>
              <input
                style={input}
                placeholder={preview.database}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="cranezo-btn-primary"
                style={{ background: canClear ? '#dc2626' : undefined, opacity: canClear ? 1 : 0.5 }}
                onClick={clear}
                disabled={!canClear}
              >
                {busy ? 'Clearing…' : 'Clear database'}
              </button>
            </div>
          </Section>
        </>
      ) : !error ? (
        <div style={muted}>Loading…</div>
      ) : null}
    </div>
  );
};

export default ClearDatabase;
