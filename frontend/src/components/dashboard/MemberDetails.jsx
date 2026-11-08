import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Ban, RotateCcw, FileText, Phone, Mail, MapPin, Briefcase, Construction, Users, Calendar, Wallet, CheckCircle2, XCircle, HardHat, ClipboardList,
} from 'lucide-react';
import { apiRequest, fileUrl } from '../../utils/api';

const dash = (value) => (value === null || value === undefined || value === '' ? '-' : value);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const inr = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN')}`;
const STATUS_CLASS = { 7: 'completed', 4: 'cancelled', 2: 'cancelled', 3: 'cancelled', 8: 'pending', 0: 'pending', 1: 'confirmed', 5: 'in-progress', 6: 'in-progress' };

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const Section = ({ title, icon: Icon, right, children, style }) => (
  <div className="cranezo-card" style={{ padding: '16px 18px', marginBottom: 16, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
      {Icon && <Icon size={15} color="#f59e0b" />}
      <h3 className="cranezo-card-title" style={{ margin: 0, flex: 1 }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

/** label on the left, value on the right: Business Information, License Information ... */
const InfoRows = ({ items }) => (
  <div style={{ display: 'grid', gap: 10 }}>
    {items.map(([label, value]) => (
      <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 38%) 1fr', gap: 10, fontSize: 13 }}>
        <span style={{ color: 'var(--dash-text-subtle)' }}>{label}</span>
        <span style={{ color: 'var(--dash-text-body)', wordBreak: 'break-word' }}>{dash(value)}</span>
      </div>
    ))}
  </div>
);

/** small label above a value, used in the strip under the profile card */
const Facts = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, borderTop: '1px solid var(--dash-border-subtle)', paddingTop: 14, marginTop: 14 }}>
    {items.map(([label, value]) => (
      <div key={label}>
        <div style={{ fontSize: 11, color: 'var(--dash-text-subtle)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-title)', wordBreak: 'break-word' }}>{dash(value)}</div>
      </div>
    ))}
  </div>
);

const StatTiles = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
    {items.map((t) => {
      const Icon = t.icon;
      return (
        <div key={t.label} className="cranezo-stat-card" style={{ minHeight: 70 }}>
          <div className="cranezo-stat-card-left">
            <div className="cranezo-stat-icon-box"><Icon size={18} /></div>
            <div className="cranezo-stat-info">
              <span className="cranezo-stat-label">{t.label}</span>
              <span className="cranezo-stat-value">{t.value}</span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--dash-border)', marginBottom: 16, overflowX: 'auto' }}>
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          color: active === t.id ? '#f59e0b' : 'var(--dash-text-muted)',
          borderBottom: active === t.id ? '2px solid #f59e0b' : '2px solid transparent', marginBottom: -1,
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const MiniTable = ({ headers, rows, empty }) => (
  <div className="cranezo-table-container">
    <table className="cranezo-table" style={{ minWidth: 480 }}>
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i}>{cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
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

export const MemberDetails = ({ userId, onBack, onSelectCrane }) => {
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

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
    setTab('overview');
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
      <span key="s" className={`cranezo-status-badge ${{ 0: 'pending', 1: 'active', 2: 'blocked' }[c.approval_status]}`}>{c.approval_label}</span>,
    ]);
  const craneHeaders = ['Crane', 'Type', 'Capacity', 'Location', 'Availability', 'Status'];

  const bookingTable = (rows, empty) => (
    <MiniTable
      headers={['Booking', 'Crane', 'Date', 'Location', 'Amount', 'Status']}
      rows={rows.map((b) => [
        <strong key="c" className="cranezo-booking-id">{b.booking_code}</strong>,
        dash(b.crane_title),
        date(b.start_at || b.created_at),
        dash(b.location),
        inr(b.total),
        <span key="s" className={`cranezo-status-badge ${STATUS_CLASS[b.status] || 'pending'}`}>{b.status_label}</span>,
      ])}
      empty={empty}
    />
  );

  if (loading && !member) {
    return <div className="cranezo-content-view"><p style={{ color: 'var(--dash-text-muted)' }}>Loading...</p></div>;
  }

  const m = member;
  const roleTitle = m ? { 1: 'Owner Details', 2: 'Operator Details', 3: 'User Details' }[m.role_id] : '';
  const stats = (m && m.stats) || {};
  const recent = (m && m.recent_bookings) || [];

  const documents = m && m.role_id === 2 && (
    <Section title={`Documents (${m.documents.filter((d) => d.uploaded).length})`} icon={FileText}>
      {m.documents.map((d) => (
        <div key={d.key} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--dash-border-subtle)' }}>
          <FileText size={16} />
          <span>{d.label}</span>
          <span className={`cranezo-status-badge ${{ 0: 'pending', 1: 'active', 2: 'blocked' }[d.status] || ''}`}>{d.status_label}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
            {d.files.filter((x) => x.file_url).map((x) => (
              <a key={x.label} href={fileUrl(x.file_url)} target="_blank" rel="noreferrer" style={{ color: '#f59e0b' }}>
                {d.files.length > 1 ? `View ${x.label}` : 'View'}
              </a>
            ))}
            {d.uploaded && d.status !== 1 && (
              <button type="button" className="cranezo-btn-primary-amber" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setDocumentStatus(d, 1)}>Approve</button>
            )}
            {d.uploaded && d.status !== 2 && (
              <button type="button" className="cranezo-btn-danger-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setDocumentStatus(d, 2)}>Reject</button>
            )}
          </div>
        </div>
      ))}
    </Section>
  );

  return (
    <div className="cranezo-content-view animate-fade-in">
      <button type="button" className="cranezo-btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back
      </button>

      {error && <div className="cranezo-card" style={{ padding: '12px 16px', marginBottom: 12, color: '#ef4444' }}>{error}</div>}

      {m && (
        <>
          {/* title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 className="cranezo-greeting-title" style={{ margin: 0 }}>{roleTitle}</h2>
                <span className={`cranezo-status-badge ${m.status === 0 ? 'active' : 'blocked'}`}>{m.status_label}</span>
                {m.role_id === 2 && (
                  <span className={`cranezo-status-badge ${m.is_online ? 'active' : 'pending'}`}>{m.is_online ? 'Online' : 'Offline'}</span>
                )}
              </div>
              <div style={{ color: 'var(--dash-text-muted)', fontSize: 13, marginTop: 4 }}>{m.member_id}</div>
            </div>
            <button type="button" className={m.status === 0 ? 'cranezo-btn-danger-outline' : 'cranezo-btn-secondary'} onClick={toggleBlock}>
              {m.status === 0 ? <><Ban size={15} /> Block {m.role_name}</> : <><RotateCcw size={15} /> Unblock</>}
            </button>
          </div>

          {/* profile card */}
          <div className="cranezo-card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {m.profile_image ? (
                <img src={fileUrl(m.profile_image)} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="cranezo-table-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>{initials(m.full_name || m.company_name)}</div>
              )}
              <div style={{ minWidth: 180 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dash-text-title)' }}>{m.full_name || m.company_name || m.member_id}</div>
                <div style={{ color: 'var(--dash-text-muted)', fontSize: 13 }}>
                  {m.role_name}{m.company_name && m.full_name ? ` · ${m.company_name}` : ''}{m.joined_at ? ` · since ${date(m.joined_at)}` : ''}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`cranezo-status-badge ${m.is_mobile_verified ? 'active' : 'pending'}`}>Mobile {m.is_mobile_verified ? 'Verified' : 'Pending'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginLeft: 'auto', fontSize: 13, color: 'var(--dash-text-body)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} color="#f59e0b" />{dash(m.contact)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} color="#f59e0b" />{dash(m.user_email)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color="#f59e0b" />{[m.city, m.state_name || m.state].filter(Boolean).join(', ') || '-'}</span>
              </div>
            </div>

            {m.role_id === 1 && (
              <Facts items={[['Business Type', m.owner_type || m.business_ownership_type], ['GST Number', m.gst_number], ['Registration Date', date(m.joined_at)]]} />
            )}
            {m.role_id === 2 && (
              <Facts items={[
                ['Experience', m.years_of_experience],
                ['License No.', m.operator_license_number],
                ['Assigned Crane', m.assigned_cranes.length ? m.assigned_cranes.map((c) => `${c.capacity_name || ''} ${c.crane_type_name || ''}`.trim()).join(', ') : 'Not assigned'],
              ]} />
            )}
          </div>

          {/* ---------------- customer ---------------- */}
          {m.role_id === 3 && (
            <>
              <StatTiles items={[
                { label: 'Total Bookings', value: stats.total_bookings || 0, icon: Calendar },
                { label: 'Total Spent', value: inr(stats.total_spent), icon: Wallet },
                { label: 'Completed Jobs', value: stats.completed || 0, icon: CheckCircle2 },
                { label: 'Cancelled Bookings', value: stats.cancelled || 0, icon: XCircle },
              ]} />
              <Tabs
                tabs={[{ id: 'overview', label: 'Booking History' }, { id: 'details', label: 'Account Details' }]}
                active={tab}
                onChange={setTab}
              />
              {tab === 'overview' && (
                <Section title="Booking History" icon={ClipboardList}>
                  {bookingTable(recent, 'No bookings yet.')}
                </Section>
              )}
              {tab === 'details' && (
                <>
                  <Section title="Contact & Location">
                    <InfoRows items={[['Mobile', m.contact], ['Email', m.user_email], ['Address', m.business_address], ['City', m.city], ['State', m.state_name || m.state], ['Pincode', m.pincode], ['Language', m.language]]} />
                  </Section>
                  {m.customer_type_name === 'Business User' ? (
                    <Section title="Business Details">
                      <InfoRows items={[['Company', m.company_name], ['Constitution', m.constitution_name], ['Established', date(m.company_date_establishment)], ['GST Number', m.gst_number], ['Nature of Business', m.nature_of_business_name], ['Directors / Partners', m.directors_details], ['Finance Head', m.finance_head_details], ['Branch Offices', m.branch_offices_details]]} />
                    </Section>
                  ) : (
                    <Section title="Identity">
                      <InfoRows items={[['Customer Type', m.customer_type_name], ['Aadhar Number', m.aadhar_number], ['PAN Number', m.pan_number]]} />
                    </Section>
                  )}
                </>
              )}
            </>
          )}

          {/* ---------------- owner ---------------- */}
          {m.role_id === 1 && (
            <>
              <Tabs
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'cranes', label: `Cranes (${m.cranes.length})` },
                  { id: 'operators', label: `Operators (${m.operators.length})` },
                  { id: 'bookings', label: `Bookings (${stats.total_bookings || 0})` },
                ]}
                active={tab}
                onChange={setTab}
              />
              {tab === 'overview' && (
                <>
                  <StatTiles items={[
                    { label: 'Total Cranes', value: m.cranes_total, icon: Construction },
                    { label: 'Total Operators', value: m.operators.length, icon: Users },
                    { label: 'Total Bookings', value: stats.total_bookings || 0, icon: Calendar },
                    { label: 'Total Earnings', value: inr(stats.total_earnings), icon: Wallet },
                  ]} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    <Section title="Business Information" icon={Briefcase}>
                      <InfoRows items={[['Company', m.company_name], ['Contact Person', m.full_name], ['Email', m.user_email], ['Phone', m.contact], ['Address', [m.business_address, m.city, m.pincode].filter(Boolean).join(', ')], ['Experience', m.years_of_experience], ['Partners', m.number_of_business_partners], ['Category', m.business_category]]} />
                    </Section>
                    <Section title="Verification Status">
                      <InfoRows items={[
                        ['Mobile', m.is_mobile_verified ? 'Verified' : 'Pending'],
                        ['Cranes verified', `${m.cranes_verified} of ${m.cranes_total}`],
                        ['Account', m.status_label],
                      ]} />
                    </Section>
                  </div>
                  <Section title="Recent Bookings" icon={ClipboardList} right={<button type="button" className="cranezo-action-link" onClick={() => setTab('bookings')}>View All</button>}>
                    {bookingTable(recent.slice(0, 3), 'No bookings yet.')}
                  </Section>
                </>
              )}
              {tab === 'cranes' && (
                <Section title={`Cranes (${m.cranes.length})`} icon={Construction}>
                  <MiniTable headers={craneHeaders} rows={craneRows(m.cranes)} empty="No cranes added yet." />
                </Section>
              )}
              {tab === 'operators' && (
                <Section title={`Operators added by this owner (${m.operators.length})`} icon={HardHat}>
                  <MiniTable headers={['Operator', 'Member ID', 'Contact']} rows={m.operators.map((o) => [o.full_name, o.member_id, o.contact])} empty="No operators added." />
                </Section>
              )}
              {tab === 'bookings' && (
                <Section title="Bookings" icon={ClipboardList}>{bookingTable(recent, 'No bookings yet.')}</Section>
              )}
            </>
          )}

          {/* ---------------- operator ---------------- */}
          {m.role_id === 2 && (
            <>
              <Tabs
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'documents', label: `Documents (${m.documents.filter((d) => d.uploaded).length})` },
                  { id: 'jobs', label: 'Job History' },
                ]}
                active={tab}
                onChange={setTab}
              />
              {tab === 'overview' && (
                <>
                  <StatTiles items={[
                    { label: 'Total Jobs', value: stats.total_bookings || 0, icon: Briefcase },
                    { label: 'Completed Jobs', value: stats.completed || 0, icon: CheckCircle2 },
                    { label: 'Cancelled Jobs', value: stats.cancelled || 0, icon: XCircle },
                    { label: 'Commission Earned', value: inr(stats.total_earned), icon: Wallet },
                  ]} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    <Section title="License Information" icon={FileText}>
                      <InfoRows items={[
                        ['Operator Type', m.operator_type_name],
                        ['License Number', m.operator_license_number],
                        ['Expiry Date', date(m.license_expiry_date)],
                        ['License Status', m.license_expired === null ? '-' : m.license_expired ? 'Expired' : 'Valid'],
                        ['Registration', m.source === 'owner_added' ? 'Added by owner' : 'Self registered'],
                        ['Owner', m.owner ? `${m.owner.full_name || ''} (${m.owner.member_id})` : 'Independent'],
                        ['Owner Contact', m.owner ? m.owner.contact : null],
                      ]} />
                    </Section>
                    <Section title="Assigned Crane" icon={Construction}>
                      <MiniTable headers={craneHeaders} rows={craneRows(m.assigned_cranes)} empty="No crane assigned." />
                    </Section>
                  </div>
                  <Section title="Recent Job History" icon={ClipboardList} right={<button type="button" className="cranezo-action-link" onClick={() => setTab('jobs')}>View All</button>}>
                    {bookingTable(recent.slice(0, 4), 'No jobs yet.')}
                  </Section>
                </>
              )}
              {tab === 'documents' && documents}
              {tab === 'jobs' && <Section title="Job History" icon={ClipboardList}>{bookingTable(recent, 'No jobs yet.')}</Section>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MemberDetails;
