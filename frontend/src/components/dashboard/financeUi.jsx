import React from 'react';

/** Shared look for the Payments, Settlements, Complaints and Platform Fee pages: plain sections, tables and forms. */
export const card = { background: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 18px' };
export const input = {
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
export const label = { display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--dash-text-subtle)', margin: '0 0 6px' };
export const muted = { color: 'var(--dash-text-muted)', fontSize: 13 };

export const inr = (n) =>
  n === null || n === undefined ? '-' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const when = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
export const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="cranezo-users-header-row">
    <div>
      <h2 className="cranezo-greeting-title">{title}</h2>
      {subtitle && <p className="cranezo-greeting-subtitle">{subtitle}</p>}
    </div>
    {children && <div className="cranezo-header-actions-group">{children}</div>}
  </div>
);

export const Section = ({ title, right, children, style }) => (
  <div style={{ ...card, marginBottom: 16, ...style }}>
    {(title || right) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {title && <h3 className="cranezo-card-title" style={{ margin: 0 }}>{title}</h3>}
        {right}
      </div>
    )}
    {children}
  </div>
);

export const Stats = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
    {items.map((s) => (
      <div key={s.label} style={card}>
        <div style={{ ...label, margin: 0 }}>{s.label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: s.color || 'var(--dash-text-title)', marginTop: 6 }}>{s.value}</div>
        {s.hint && <div style={{ ...muted, fontSize: 12, marginTop: 2 }}>{s.hint}</div>}
      </div>
    ))}
  </div>
);

/** headers: [text]; rows: [[cell]]; onRow(i) makes a row clickable */
export const Table = ({ headers, rows, empty = 'Nothing to show.', onRow, minWidth = 640 }) => (
  <div className="cranezo-table-container">
    <table className="cranezo-table" style={{ minWidth }}>
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} onClick={onRow ? () => onRow(i) : undefined} style={onRow ? { cursor: 'pointer' } : undefined}>
            {cells.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={headers.length} style={{ textAlign: 'center', padding: 20, color: 'var(--dash-text-muted)' }}>{empty}</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const TONES = { good: 'active', warn: 'pending', bad: 'blocked' };
export const Badge = ({ tone = 'warn', children }) => <span className={`cranezo-status-badge ${TONES[tone] || ''}`}>{children}</span>;

export const ErrorBox = ({ message }) => (message ? <div style={{ ...card, color: '#ef4444', marginBottom: 12 }}>{message}</div> : null);
export const OkBox = ({ message }) => (message ? <div style={{ ...card, color: '#22c55e', marginBottom: 12 }}>{message}</div> : null);

/** Previous / Next for min-max paged APIs */
export const Pager = ({ page, size, total, onPage }) => {
  if (!total || total <= size) return null;
  const last = Math.ceil(total / size) - 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 12, ...muted }}>
      <span>{page * size + 1}-{Math.min(total, (page + 1) * size)} of {total}</span>
      <button type="button" className="cranezo-btn-secondary" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
      <button type="button" className="cranezo-btn-secondary" disabled={page >= last} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
};
