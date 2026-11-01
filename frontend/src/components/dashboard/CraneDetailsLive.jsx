import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';

const dash = (value) => (value === null || value === undefined || value === '' ? '-' : value);
const dateTime = (value) => (value ? new Date(value).toLocaleString('en-IN') : '-');
const BADGE = { 0: 'pending', 1: 'active', 2: 'blocked' };

const Section = ({ title, children }) => (
  <div className="cranzo-card" style={{ padding: '18px 20px', marginBottom: '16px' }}>
    <h3 className="cranzo-card-title" style={{ margin: '0 0 14px' }}>{title}</h3>
    {children}
  </div>
);

const Fields = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
    {items.map(([label, value]) => (
      <div key={label}>
        <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{ color: 'var(--dash-text-body)', fontSize: '14px' }}>{dash(value)}</div>
      </div>
    ))}
  </div>
);

export const CraneDetailsLive = ({ craneId, onBack, onSelectMember, onReviewed }) => {
  const [crane, setCrane] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/admin/cranes/get', { method: 'POST', body: { crane_id: craneId } });
      setCrane(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [craneId]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (action) => {
    if (action === 'reject' && !reason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    setActing(true);
    setError('');
    try {
      const res = await apiRequest(`/admin/cranes/${craneId}/${action}`, {
        method: 'PUT',
        body: action === 'reject' ? { reason: reason.trim() } : undefined,
      });
      setCrane(res.data);
      setRejecting(false);
      setReason('');
      if (onReviewed) onReviewed();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading && !crane) {
    return <div className="cranzo-content-view"><p style={{ color: 'var(--dash-text-muted)' }}>Loading...</p></div>;
  }

  return (
    <div className="cranzo-content-view animate-fade-in">
      <button type="button" className="cranzo-btn-secondary" onClick={onBack} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={15} /> Back
      </button>

      {error && (
        <div className="cranzo-card" style={{ padding: '12px 16px', marginBottom: '12px', color: '#ef4444' }}>{error}</div>
      )}

      {crane && (
        <>
          <div className="cranzo-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 className="cranzo-greeting-title" style={{ margin: 0 }}>
                {crane.crane_code} · {crane.model_name || crane.crane_type_name}
              </h2>
              <span className={`cranzo-status-badge ${BADGE[crane.approval_status]}`}>{crane.approval_label}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                {crane.approval_status !== 2 && !rejecting && (
                  <button type="button" className="cranzo-btn-danger-outline" onClick={() => setRejecting(true)}>
                    <XCircle size={14} /> Reject
                  </button>
                )}
                {crane.approval_status !== 1 && !rejecting && (
                  <button type="button" className="cranzo-btn-primary-amber" disabled={acting} onClick={() => review('approve')}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                )}
              </div>
            </div>
            <p style={{ color: 'var(--dash-text-muted)', fontSize: '13px', margin: '10px 0 0' }}>{crane.status_message}</p>

            {rejecting && (
              <div style={{ marginTop: '14px' }}>
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
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="cranzo-btn-secondary" onClick={() => setRejecting(false)}>Back</button>
                  <button type="button" className="cranzo-btn-danger-outline" disabled={acting} onClick={() => review('reject')}>
                    <XCircle size={14} /> Confirm Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {crane.photos.length > 0 && (
            <Section title="Photos">
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {crane.photos.map((p) => (
                  <img key={p.id} src={fileUrl(p.photo_url)} alt="Crane" style={{ height: '140px', borderRadius: '8px', objectFit: 'cover' }} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Specifications">
            <Fields
              items={[
                ['Crane Type', crane.crane_type_name],
                ['Capacity', crane.capacity_name],
                ['Fuel Type', crane.fuel_type_name],
                ['Registration', crane.registration_number],
                ['Location', crane.location],
                ['Hourly Rate', `₹ ${crane.hourly_rate.toLocaleString('en-IN')}`],
                ['Minimum Hours', crane.minimum_hours],
                ['Availability', crane.availability_label],
                ['Submitted', dateTime(crane.submitted_at)],
                ['Review Due By', dateTime(crane.expected_review_by)],
                ['Reviewed', dateTime(crane.reviewed_at)],
                ['Rejection Reason', crane.rejection_reason],
              ]}
            />
          </Section>

          <Section title="Owner & Operator">
            <Fields
              items={[
                ['Owner', crane.owner ? crane.owner.full_name || crane.owner.company_name : null],
                ['Owner ID', crane.owner ? crane.owner.member_id : null],
                ['Owner Mobile', crane.owner ? `${crane.owner.country_code || ''} ${crane.owner.mobile_number || ''}` : null],
                ['Operator', crane.operator ? crane.operator.full_name : 'Not assigned'],
                ['Operator ID', crane.operator ? crane.operator.member_id : null],
                ['Operator Mobile', crane.operator ? `${crane.operator.country_code || ''} ${crane.operator.mobile_number || ''}` : null],
              ]}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              {crane.owner && (
                <button type="button" className="cranzo-btn-secondary" onClick={() => onSelectMember(crane.owner.id, 'owner')}>
                  View Owner
                </button>
              )}
              {crane.operator && (
                <button type="button" className="cranzo-btn-secondary" onClick={() => onSelectMember(crane.operator.id, 'operator')}>
                  View Operator
                </button>
              )}
            </div>
          </Section>

          <Section title={`Documents (${crane.documents.length})`}>
            {crane.documents.map((doc) => {
              const expired = doc.expiry_date && doc.expiry_date < new Date().toISOString().slice(0, 10);
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--dash-border-subtle)' }}>
                  <FileText size={16} />
                  <span>{doc.document_type_name}</span>
                  <span style={{ color: expired ? '#ef4444' : 'var(--dash-text-subtle)', fontSize: '12px' }}>
                    Expiry: {dash(doc.expiry_date)}{expired ? ' (expired)' : ''}
                  </span>
                  <a href={fileUrl(doc.file_url)} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: '13px' }}>
                    View
                  </a>
                </div>
              );
            })}
          </Section>
        </>
      )}
    </div>
  );
};

export default CraneDetailsLive;
