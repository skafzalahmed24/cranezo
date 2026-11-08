import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Ban, RotateCcw, FileText } from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';

const dash = (value) => (value === null || value === undefined || value === '' ? '-' : value);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

const initials = (name) =>
  String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

const Section = ({ title, children }) => (
  <div className="cranezo-card" style={{ padding: '18px 20px', marginBottom: '16px' }}>
    <h3 className="cranezo-card-title" style={{ margin: '0 0 14px' }}>{title}</h3>
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
        <div style={{ color: 'var(--dash-text-body)', fontSize: '14px', wordBreak: 'break-word' }}>{dash(value)}</div>
      </div>
    ))}
  </div>
);

const MiniTable = ({ headers, rows, empty }) => (
  <div className="cranezo-table-container">
    <table className="cranezo-table" style={{ minWidth: '480px' }}>
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i}>{cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={headers.length} style={{ textAlign: 'center', padding: '20px', color: 'var(--dash-text-muted)' }}>
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export const MemberDetails = ({ userId, onBack, onSelectCrane }) => {
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/admin/members/get', { method: 'POST', body: { user_id: userId } });
      setMember(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBlock = async () => {
    const next = member.status === 0 ? 1 : 0;
    if (!window.confirm(`Are you sure you want to ${next === 1 ? 'block' : 'unblock'} this account?`)) return;
    try {
      const res = await apiRequest(`/admin/members/${member.id}/status`, { method: 'PUT', body: { status: next } });
      setMember(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const setDocumentStatus = async (doc, status) => {
    if (status === 2 && !window.confirm(`Reject ${doc.label}? The operator will need to upload it again.`)) return;
    try {
      const res = await apiRequest(`/admin/members/${member.id}/documents`, { method: 'PUT', body: { document: doc.key, status } });
      setMember(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const craneRows = (cranes) =>
    cranes.map((c) => [
      <span key="c" className="cranezo-link-text" onClick={() => onSelectCrane(c.id)}>{c.crane_code}</span>,
      dash(c.crane_type_name),
      dash(c.capacity_name),
      c.location,
      c.availability_label,
      <span key="s" className={`cranezo-status-badge ${{ 0: 'pending', 1: 'active', 2: 'blocked' }[c.approval_status]}`}>
        {c.approval_label}
      </span>,
    ]);
  const craneHeaders = ['Crane', 'Type', 'Capacity', 'Location', 'Availability', 'Status'];

  if (loading && !member) {
    return <div className="cranezo-content-view"><p style={{ color: 'var(--dash-text-muted)' }}>Loading...</p></div>;
  }

  return (
    <div className="cranezo-content-view animate-fade-in">
      <button type="button" className="cranezo-btn-secondary" onClick={onBack} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={15} /> Back
      </button>

      {error && (
        <div className="cranezo-card" style={{ padding: '12px 16px', marginBottom: '12px', color: '#ef4444' }}>{error}</div>
      )}

      {member && (
        <>
          <div className="cranezo-card" style={{ padding: '20px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {member.profile_image ? (
              <img src={fileUrl(member.profile_image)} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="cranezo-table-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
                {initials(member.full_name || member.company_name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 className="cranezo-greeting-title" style={{ margin: 0 }}>
                {member.full_name || member.company_name || member.member_id}
              </h2>
              <div style={{ color: 'var(--dash-text-muted)', fontSize: '13px', marginTop: '4px' }}>
                {member.member_id} · {member.role_name}
                {member.company_name && member.full_name ? ` · ${member.company_name}` : ''}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <span className={`cranezo-status-badge ${member.status === 0 ? 'active' : 'blocked'}`}>{member.status_label}</span>
                <span className={`cranezo-status-badge ${member.is_mobile_verified ? 'active' : 'pending'}`}>
                  Mobile {member.is_mobile_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
            <button type="button" className="cranezo-btn-secondary" onClick={toggleBlock}>
              {member.status === 0 ? <><Ban size={15} /> Block</> : <><RotateCcw size={15} /> Unblock</>}
            </button>
          </div>

          <Section title="Contact & Location">
            <Fields
              items={[
                ['Mobile', member.contact],
                ['Email', member.user_email],
                ['Address', member.business_address],
                ['City', member.city],
                ['State', member.state_name || member.state],
                ['Pincode', member.pincode],
                ['Language', member.language],
                ['Joined', date(member.joined_at)],
              ]}
            />
          </Section>

          {member.role_id === 1 && (
            <>
              <Section title="Business">
                <Fields
                  items={[
                    ['Company', member.company_name],
                    ['Owner Type', member.owner_type],
                    ['Experience', member.years_of_experience],
                    ['Business Partners', member.number_of_business_partners],
                    ['Ownership Type', member.business_ownership_type],
                    ['Established', date(member.company_date_establishment)],
                    ['Business Category', member.business_category],
                    ['Cranes (verified / total)', `${member.cranes_verified} / ${member.cranes_total}`],
                  ]}
                />
              </Section>
              <Section title={`Cranes (${member.cranes.length})`}>
                <MiniTable headers={craneHeaders} rows={craneRows(member.cranes)} empty="No cranes added yet." />
              </Section>
              <Section title={`Operators added by this owner (${member.operators.length})`}>
                <MiniTable
                  headers={['Operator', 'Member ID', 'Contact']}
                  rows={member.operators.map((o) => [o.full_name, o.member_id, o.contact])}
                  empty="No operators added."
                />
              </Section>
            </>
          )}

          {member.role_id === 2 && (
            <>
              <Section title="Operator & License">
                <Fields
                  items={[
                    ['Operator Type', member.operator_type_name],
                    ['License Number', member.operator_license_number],
                    ['License Expiry', date(member.license_expiry_date)],
                    ['License Status', member.license_expired === null ? '-' : member.license_expired ? 'Expired' : 'Valid'],
                    ['Experience', member.years_of_experience],
                    ['Registration', member.source === 'owner_added' ? 'Added by owner' : 'Self registered'],
                    ['Owner', member.owner ? `${member.owner.full_name || ''} (${member.owner.member_id})` : 'Independent'],
                    ['Owner Contact', member.owner ? member.owner.contact : null],
                  ]}
                />
              </Section>
              <Section title="Documents">
                {member.documents.map((d) => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--dash-border-subtle)' }}>
                    <FileText size={16} />
                    <span>{d.label}</span>
                    <span className={`cranezo-status-badge ${{ 0: 'pending', 1: 'active', 2: 'blocked' }[d.status] || ''}`}>{d.status_label}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                      {d.files.filter((x) => x.file_url).map((x) => (
                        <a key={x.label} href={fileUrl(x.file_url)} target="_blank" rel="noreferrer" style={{ color: '#f59e0b' }}>
                          {d.files.length > 1 ? `View ${x.label}` : 'View'}
                        </a>
                      ))}
                      {d.uploaded && d.status !== 1 && (
                        <button type="button" className="cranezo-btn-primary-amber" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setDocumentStatus(d, 1)}>
                          Approve
                        </button>
                      )}
                      {d.uploaded && d.status !== 2 && (
                        <button type="button" className="cranezo-btn-danger-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setDocumentStatus(d, 2)}>
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </Section>
              <Section title={`Assigned cranes (${member.assigned_cranes.length})`}>
                <MiniTable headers={craneHeaders} rows={craneRows(member.assigned_cranes)} empty="No crane assigned." />
              </Section>
            </>
          )}

          {member.role_id === 3 && (
            <>
              <Section title="Customer">
                <Fields
                  items={[
                    ['Customer Type', member.customer_type_name],
                    ['Bookings', member.bookings],
                    ['Total Spent', `₹ ${Number(member.total_spent).toLocaleString('en-IN')}`],
                  ]}
                />
              </Section>
              {member.customer_type_name === 'Business User' ? (
                <Section title="Business Details">
                  <Fields
                    items={[
                      ['Company', member.company_name],
                      ['Constitution', member.constitution_name],
                      ['Established', date(member.company_date_establishment)],
                      ['GST Number', member.gst_number],
                      ['Nature of Business', member.nature_of_business_name],
                      ['Directors / Partners', member.directors_details],
                      ['Finance Head', member.finance_head_details],
                      ['Branch Offices', member.branch_offices_details],
                    ]}
                  />
                </Section>
              ) : (
                <Section title="Identity">
                  <Fields items={[['Aadhar Number', member.aadhar_number], ['PAN Number', member.pan_number]]} />
                </Section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MemberDetails;
