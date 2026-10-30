import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Search, FileText, X } from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: '0', label: 'Under Review', key: 'under_review' },
  { id: '1', label: 'Verified', key: 'verified' },
  { id: '2', label: 'Rejected', key: 'rejected' },
];

const STATUS_COLORS = {
  0: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#f59e0b' },
  1: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#10b981' },
  2: { bg: 'rgba(239, 68, 68, 0.15)', fg: '#ef4444' },
};

const StatusBadge = ({ status, label }) => {
  const color = STATUS_COLORS[status] || STATUS_COLORS[0];
  return (
    <span
      style={{
        background: color.bg,
        color: color.fg,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');

const hoursWaiting = (submittedAt) =>
  Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 3600000));

const PAGE_SIZE = 10;

export const CraneApprovals = ({ onReviewed }) => {
  const [statusFilter, setStatusFilter] = useState('0');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cranes, setCranes] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const [summary, setSummary] = useState({ under_review: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { min: (page - 1) * PAGE_SIZE, max: page * PAGE_SIZE };
      if (statusFilter) payload.approval_status = Number(statusFilter);
      if (search.trim()) payload.search = search.trim();
      const [list, counts] = await Promise.all([
        apiRequest('/admin/cranes/list', { method: 'POST', body: payload }),
        apiRequest('/admin/cranes/summary', { method: 'POST' }),
      ]);
      setCranes(list.data);
      setTotalItems(list.pagination.total);
      setSummary(counts.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openCrane = async (id) => {
    setError('');
    setRejecting(false);
    setReason('');
    try {
      const res = await apiRequest('/admin/cranes/get', { method: 'POST', body: { crane_id: id } });
      setSelected(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setRejecting(false);
    setReason('');
  };

  const review = async (action) => {
    if (action === 'reject' && !reason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    setActing(true);
    setError('');
    try {
      await apiRequest(`/admin/cranes/${selected.id}/${action}`, {
        method: 'PUT',
        body: action === 'reject' ? { reason: reason.trim() } : undefined,
      });
      closeModal();
      await load();
      if (onReviewed) onReviewed();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  };

  const cardStyle = {
    background: 'var(--dash-card)',
    border: '1px solid var(--dash-border)',
    borderRadius: '12px',
  };

  return (
    <div className="cranzo-content-view animate-fade-in">
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <button
              key={tab.id || 'all'}
              type="button"
              className={active ? 'cranzo-btn-primary-amber' : 'cranzo-btn-secondary'}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
            >
              {tab.label}
              {tab.key ? ` (${summary[tab.key]})` : ''}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--dash-text-subtle)' }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search code, registration, location"
            style={{
              height: '38px',
              width: '280px',
              paddingLeft: '30px',
              background: 'var(--dash-input-bg)',
              border: '1px solid var(--dash-input-border)',
              borderRadius: '8px',
              color: 'var(--dash-text-body)',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {error && !selected && (
        <div style={{ ...cardStyle, padding: '12px 16px', marginBottom: '12px', color: '#ef4444' }}>{error}</div>
      )}

      <div style={{ ...cardStyle, padding: '8px' }}>
        <div className="cranzo-table-container">
          <table className="cranzo-table">
            <thead>
              <tr>
                <th>Crane</th>
                <th>Type / Capacity</th>
                <th>Registration</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Submitted</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cranes.map((crane) => (
                <tr key={crane.id}>
                  <td>
                    <span className="cranzo-booking-id highlight">{crane.crane_code}</span>
                  </td>
                  <td>
                    {crane.crane_type_name} · {crane.capacity_name}
                  </td>
                  <td>{crane.registration_number}</td>
                  <td>{crane.owner ? crane.owner.full_name || crane.owner.member_id : '-'}</td>
                  <td>{crane.location}</td>
                  <td>
                    {formatDate(crane.submitted_at)}
                    {crane.approval_status === 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)' }}>
                        <Clock size={10} /> waiting {hoursWaiting(crane.submitted_at)}h of 48h
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={crane.approval_status} label={crane.approval_label} />
                  </td>
                  <td>
                    <button type="button" className="cranzo-btn-secondary" onClick={() => openCrane(crane.id)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && cranes.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--dash-text-muted)' }}>
                    No cranes found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--dash-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>
            {totalItems} crane(s) · page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="cranzo-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button
              type="button"
              className="cranzo-btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="cranzo-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            style={{
              ...cardStyle,
              width: 'min(720px, 94vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              color: 'var(--dash-text-body)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--dash-text-title)' }}>
                {selected.crane_code} · {selected.model_name || selected.crane_type_name}
              </h3>
              <StatusBadge status={selected.approval_status} label={selected.approval_label} />
              <button
                type="button"
                className="cranzo-modal-close-icon-btn"
                onClick={closeModal}
                style={{ marginLeft: 'auto' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {selected.photos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px' }}>
                {selected.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={fileUrl(photo.photo_url)}
                    alt="Crane"
                    style={{ height: '110px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
              {[
                ['Crane Type', selected.crane_type_name],
                ['Capacity', selected.capacity_name],
                ['Fuel Type', selected.fuel_type_name || '-'],
                ['Registration', selected.registration_number],
                ['Location', selected.location],
                ['Hourly Rate', `₹${selected.hourly_rate.toLocaleString()}`],
                ['Minimum Hours', selected.minimum_hours],
                ['Availability', selected.availability_label],
                ['Owner', selected.owner ? `${selected.owner.full_name || ''} (${selected.owner.member_id || '-'})` : '-'],
                ['Operator', selected.operator ? selected.operator.full_name : 'Not assigned'],
                ['Submitted', formatDate(selected.submitted_at)],
                ['Reviewed', formatDate(selected.reviewed_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)', textTransform: 'uppercase' }}>{label}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>

            <h4 style={{ margin: '20px 0 8px', color: 'var(--dash-text-title)' }}>Documents</h4>
            {selected.documents.map((doc) => (
              <div
                key={doc.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--dash-border-subtle)' }}
              >
                <FileText size={16} />
                <span>{doc.document_type_name}</span>
                <span style={{ color: 'var(--dash-text-subtle)', fontSize: '12px' }}>
                  Expiry: {doc.expiry_date || '-'}
                </span>
                <a
                  href={fileUrl(doc.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: '13px' }}
                >
                  View
                </a>
              </div>
            ))}

            {selected.approval_status === 2 && selected.rejection_reason && (
              <p style={{ color: '#ef4444', marginTop: '16px' }}>Rejection reason: {selected.rejection_reason}</p>
            )}

            {rejecting && (
              <div style={{ marginTop: '16px' }}>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for rejection (shown to the owner)"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--dash-input-bg)',
                    border: '1px solid var(--dash-input-border)',
                    borderRadius: '8px',
                    color: 'var(--dash-text-body)',
                    padding: '10px',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}

            {error && <p style={{ color: '#ef4444', marginTop: '12px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              {rejecting ? (
                <>
                  <button type="button" className="cranzo-btn-secondary" onClick={() => setRejecting(false)}>
                    Back
                  </button>
                  <button type="button" className="cranzo-btn-danger-outline" disabled={acting} onClick={() => review('reject')}>
                    <XCircle size={14} /> Confirm Reject
                  </button>
                </>
              ) : (
                <>
                  {selected.approval_status !== 2 && (
                    <button type="button" className="cranzo-btn-danger-outline" onClick={() => setRejecting(true)}>
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                  {selected.approval_status !== 1 && (
                    <button type="button" className="cranzo-btn-primary-amber" disabled={acting} onClick={() => review('approve')}>
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CraneApprovals;
