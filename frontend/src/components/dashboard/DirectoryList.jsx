import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Construction,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  Ban,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

const PAGE_SIZE = 10;

const monthYear = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-';

const dash = (value) => (value === null || value === undefined || value === '' ? '-' : value);

const displayName = (m) => m.full_name || m.company_name || m.member_id || 'Unnamed';

const initials = (name) =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

const Person = ({ member, onOpen }) => (
  <div className="cranezo-user-cell">
    <div className="cranezo-table-avatar">{initials(displayName(member))}</div>
    <div>
      <span className="cranezo-link-text" onClick={() => onOpen(member.id)}>
        {displayName(member)}
      </span>
      <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)' }}>
        {member.member_id}
        {member.full_name && member.company_name ? ` · ${member.company_name}` : ''}
      </div>
    </div>
  </div>
);

const MemberStatus = ({ member }) => (
  <span className={`cranezo-status-badge ${member.status === 0 ? 'active' : 'blocked'}`}>{member.status_label}</span>
);

const MobileBadge = ({ member }) => (
  <span className={`cranezo-status-badge ${member.is_mobile_verified ? 'active' : 'pending'}`}>
    {member.is_mobile_verified ? 'Verified' : 'Pending'}
  </span>
);

const APPROVAL_CLASS = { 0: 'pending', 1: 'active', 2: 'blocked' };

const memberCards = (noun) => (s) => [
  { label: `Total ${noun}`, value: s.total, icon: Users, boxClass: '' },
  { label: `Active ${noun}`, value: s.active, icon: UserCheck, boxClass: 'green' },
  { label: 'New This Month', value: s.new_this_month, icon: UserPlus, boxClass: '' },
  { label: `Blocked ${noun}`, value: s.blocked, icon: UserX, boxClass: 'red' },
];

const memberFetchers = (roleId) => ({
  fetchPage: (payload) => apiRequest('/admin/members/list', { method: 'POST', body: { role_id: roleId, ...payload } }),
  fetchSummary: async () => (await apiRequest('/admin/members/summary', { method: 'POST', body: { role_id: roleId } })).data,
  statusKey: 'status',
  statusOptions: [
    { value: '', label: 'All Status' },
    { value: 0, label: 'Active' },
    { value: 1, label: 'Blocked' },
  ],
  blockable: true,
});

/** One config per screen. Columns receive (row, { onOpen }) */
const KINDS = {
  users: {
    title: 'Users',
    subtitle: 'Manage and monitor all customers registered on Cranezo.',
    searchPlaceholder: 'Search by name, email, phone or city...',
    noun: 'Users',
    ...memberFetchers(3),
    cards: memberCards('Users'),
    columns: [
      { header: 'USER', render: (m, ctx) => <Person member={m} onOpen={ctx.onOpen} /> },
      { header: 'CONTACT', render: (m) => m.contact },
      { header: 'LOCATION', render: (m) => dash(m.location) },
      { header: 'BOOKINGS', align: 'center', render: (m) => m.bookings },
      { header: 'TOTAL SPENT', render: (m) => `₹ ${Number(m.total_spent).toLocaleString('en-IN')}` },
      { header: 'JOINED', render: (m) => monthYear(m.joined_at) },
      { header: 'STATUS', render: (m) => <MemberStatus member={m} /> },
    ],
  },
  owners: {
    title: 'Owners',
    subtitle: 'Crane owners registered on Cranezo and their fleets.',
    searchPlaceholder: 'Search by name, company, phone or member id...',
    noun: 'Owners',
    ...memberFetchers(1),
    cards: memberCards('Owners'),
    columns: [
      { header: 'OWNER NAME', render: (m, ctx) => <Person member={m} onOpen={ctx.onOpen} /> },
      { header: 'CONTACT', render: (m) => m.contact },
      { header: 'LOCATION', render: (m) => dash(m.location) },
      { header: 'CRANES', align: 'center', render: (m) => `${m.cranes_verified} / ${m.cranes_total}` },
      { header: 'BOOKINGS', align: 'center', render: (m) => m.bookings },
      { header: 'MOBILE', render: (m) => <MobileBadge member={m} /> },
      { header: 'STATUS', render: (m) => <MemberStatus member={m} /> },
    ],
  },
  operators: {
    title: 'Operators',
    subtitle: 'Crane operators, their licenses and assignments.',
    searchPlaceholder: 'Search by name, phone or member id...',
    noun: 'Operators',
    ...memberFetchers(2),
    cards: memberCards('Operators'),
    columns: [
      { header: 'OPERATOR', render: (m, ctx) => <Person member={m} onOpen={ctx.onOpen} /> },
      { header: 'CONTACT', render: (m) => m.contact },
      {
        header: 'ASSIGNED CRANE',
        render: (m) =>
          m.assigned_crane
            ? `${m.assigned_crane.crane_code} · ${dash(m.assigned_crane.crane_type_name)}`
            : 'Not assigned',
      },
      {
        header: 'OWNER',
        render: (m) => (m.owner ? m.owner.full_name || m.owner.member_id : 'Independent'),
      },
      { header: 'LICENSE', render: (m) => dash(m.operator_license_number) },
      { header: 'AVAILABILITY', render: (m) => m.availability_label },
      { header: 'MOBILE', render: (m) => <MobileBadge member={m} /> },
      { header: 'STATUS', render: (m) => <MemberStatus member={m} /> },
      { header: 'JOINED', render: (m) => monthYear(m.joined_at) },
    ],
  },
  cranes: {
    title: 'Crane Fleet',
    subtitle: 'Every crane registered on Cranezo with its review status.',
    searchPlaceholder: 'Search code, registration or location...',
    noun: 'Cranes',
    fetchPage: (payload) => apiRequest('/admin/cranes/list', { method: 'POST', body: payload }),
    fetchSummary: async () => (await apiRequest('/admin/cranes/summary', { method: 'POST' })).data,
    statusKey: 'approval_status',
    statusOptions: [
      { value: '', label: 'All Status' },
      { value: 0, label: 'Under Review' },
      { value: 1, label: 'Verified' },
      { value: 2, label: 'Rejected' },
    ],
    blockable: false,
    cards: (s) => [
      { label: 'Total Cranes', value: s.total, icon: Construction, boxClass: '' },
      { label: 'Available Cranes', value: s.available, icon: CheckCircle2, boxClass: 'green' },
      { label: 'Under Review', value: s.under_review, icon: Clock, boxClass: '' },
      { label: 'Rejected', value: s.rejected, icon: UserX, boxClass: 'red' },
    ],
    columns: [
      {
        header: 'CRANE',
        render: (c, ctx) => (
          <div>
            <span className="cranezo-link-text" onClick={() => ctx.onOpen(c.id)}>
              {c.crane_code}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--dash-text-subtle)' }}>{dash(c.model_name)}</div>
          </div>
        ),
      },
      { header: 'TYPE', render: (c) => dash(c.crane_type_name) },
      { header: 'CAPACITY', render: (c) => dash(c.capacity_name) },
      { header: 'REGISTRATION', render: (c) => c.registration_number },
      {
        header: 'OWNER',
        render: (c) => (c.owner ? c.owner.full_name || c.owner.company_name || c.owner.member_id : '-'),
      },
      { header: 'OPERATOR', render: (c) => (c.operator ? c.operator.full_name || c.operator.member_id : 'Not assigned') },
      { header: 'LOCATION', render: (c) => c.location },
      { header: 'AVAILABILITY', render: (c) => c.availability_label },
      { header: 'DOCUMENTS', align: 'center', render: (c) => c.documents.length },
      {
        header: 'STATUS',
        render: (c) => (
          <span className={`cranezo-status-badge ${APPROVAL_CLASS[c.approval_status]}`}>{c.approval_label}</span>
        ),
      },
    ],
  },
};

export const DirectoryList = ({ kind, onSelect }) => {
  const config = KINDS[kind];
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ min: 0, max: PAGE_SIZE, total: 0, has_more: false });
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Switching between Users / Owners / Operators / Cranes resets the table
  useEffect(() => {
    setRows([]);
    setSummary(null);
    setSearch('');
    setStatus('');
    setPage(1);
    setError('');
  }, [kind]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { min: (page - 1) * PAGE_SIZE, max: page * PAGE_SIZE };
      if (search.trim()) payload.search = search.trim();
      if (status !== '') payload[config.statusKey] = Number(status);
      const [list, counts] = await Promise.all([config.fetchPage(payload), config.fetchSummary()]);
      setRows(list.data);
      setPagination(list.pagination);
      setSummary(counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config, page, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleBlock = async (member) => {
    const next = member.status === 0 ? 1 : 0;
    const verb = next === 1 ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${verb} ${displayName(member)}?`)) return;
    try {
      await apiRequest(`/admin/members/${member.id}/status`, { method: 'PUT', body: { status: next } });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const from = pagination.total === 0 ? 0 : pagination.min + 1;
  const to = pagination.min + rows.length;
  const cards = summary ? config.cards(summary) : [];

  return (
    <div className="cranezo-content-view animate-fade-in">
      <div className="cranezo-users-header-row">
        <div>
          <h2 className="cranezo-greeting-title">{config.title}</h2>
          <p className="cranezo-greeting-subtitle">{config.subtitle}</p>
        </div>
      </div>

      <div className="cranezo-stats-grid-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="cranezo-stat-card">
              <div className="cranezo-stat-card-left">
                <div className={`cranezo-stat-icon-box ${card.boxClass}`}>
                  <Icon size={20} />
                </div>
                <div className="cranezo-stat-info">
                  <span className="cranezo-stat-label">{card.label}</span>
                  <span className="cranezo-stat-value">{Number(card.value).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cranezo-filter-toolbar">
        <div className="cranezo-filter-search-box">
          <Search size={15} />
          <input
            type="text"
            className="cranezo-filter-search-input"
            placeholder={config.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="cranezo-select-dropdown"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {config.statusOptions.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="cranezo-filter-reset"
          onClick={() => {
            setSearch('');
            setStatus('');
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>

      {error && (
        <div className="cranezo-card" style={{ padding: '12px 16px', marginBottom: '12px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      <div className="cranezo-card" style={{ padding: '8px 16px 16px 16px', width: '100%', boxSizing: 'border-box' }}>
        <div className="cranezo-table-container">
          <table className="cranezo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '45px' }}>#</th>
                {config.columns.map((col) => (
                  <th key={col.header} style={{ textAlign: col.align || 'left' }}>
                    {col.header}
                  </th>
                ))}
                <th style={{ textAlign: 'center', minWidth: '80px' }}>ACT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ color: '#64748b' }}>{pagination.min + index + 1}</td>
                  {config.columns.map((col) => (
                    <td key={col.header} style={{ textAlign: col.align || 'left' }}>
                      {col.render(row, { onOpen: onSelect })}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button type="button" className="cranezo-action-btn" title="View Details" onClick={() => onSelect(row.id)}>
                        <Eye size={15} />
                      </button>
                      {config.blockable && (
                        <button
                          type="button"
                          className="cranezo-action-btn"
                          title={row.status === 0 ? 'Block' : 'Unblock'}
                          onClick={() => toggleBlock(row)}
                        >
                          {row.status === 0 ? <Ban size={15} /> : <RotateCcw size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={config.columns.length + 2} style={{ textAlign: 'center', padding: '32px', color: 'var(--dash-text-muted)' }}>
                    No {config.noun.toLowerCase()} found.
                  </td>
                </tr>
              )}
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={config.columns.length + 2} style={{ textAlign: 'center', padding: '32px', color: 'var(--dash-text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cranezo-pagination-bar">
          <span className="cranezo-pagination-text">
            Showing {from} to {to} of {pagination.total} {config.noun.toLowerCase()}
          </span>
          <div className="cranezo-pagination-controls">
            <button
              type="button"
              className={`cranezo-page-btn ${page === 1 ? 'disabled' : ''}`}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="cranezo-page-btn active">
              {page}
            </button>
            <button
              type="button"
              className={`cranezo-page-btn ${pagination.has_more ? '' : 'disabled'}`}
              disabled={!pagination.has_more}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectoryList;
