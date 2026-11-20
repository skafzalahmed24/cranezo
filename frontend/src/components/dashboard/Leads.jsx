import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, Badge, ErrorBox, OkBox, Pager, input, label, when } from './financeUi';

const PAGE = 20;
const STATUS_TONE = { new: 'warn', contacted: 'warn', joined: 'good', rejected: 'bad' };
const STATUS_LABEL = { new: 'New', contacted: 'Contacted', joined: 'Joined', rejected: 'Not joining' };

/** Admin > Join requests: owners and operators who filled in the form on the website, with filters */
const Leads = () => {
  const [opts, setOpts] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ kind: '', status: '', search: '', equipment: '', supplies_operators: '', primary_role: '', license_status: '' });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const names = useMemo(() => {
    const m = {};
    if (opts) {
      [...opts.owner.equipment, ...opts.owner.operators, ...opts.owner.documents, ...opts.operator.roles, ...opts.operator.license, ...opts.operator.documents].forEach((o) => { m[o.id] = o.name; });
    }
    return m;
  }, [opts]);
  const nm = (k) => names[k] || k;

  const query = useCallback((f, p) => {
    const body = { min: p * PAGE, max: p * PAGE + PAGE };
    Object.entries(f).forEach(([k, v]) => { if (v) body[k] = v; });
    return body;
  }, []);

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([
        apiRequest('/admin/leads/list', { method: 'POST', body: query(filters, page) }),
        apiRequest('/admin/leads/summary', { method: 'POST', body: {} }),
      ]);
      setRows(list.data || []);
      setTotal((list.pagination && list.pagination.total) || 0);
      setSummary(sum.data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [filters, page, query]);

  useEffect(() => { apiRequest('/admin/leads/options', { method: 'POST', body: {} }).then((r) => setOpts(r.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const set = (patch) => { setFilters({ ...filters, ...patch }); setPage(0); };
  // switching the kind clears the filters that belong to the other kind
  const setKind = (kind) => set({ kind, equipment: '', supplies_operators: '', primary_role: '', license_status: '' });

  const update = async (lead, patch) => {
    try {
      const res = await apiRequest('/admin/leads/update', { method: 'POST', body: { id: lead.id, ...patch } });
      setOpen(res.data);
      setOk('Saved.');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const detailRows = (l) => {
    const a = l.answers || {};
    if (l.kind === 'owner') {
      return [
        ['Yard and areas', l.city],
        ['Equipment', (a.equipment || []).map(nm).join(', ') + (a.equipment_other ? ` (${a.equipment_other})` : '')],
        ['Fleet and models', a.fleet_details],
        ['Supplies operators', nm(a.supplies_operators)],
        ['Documents', (a.documents || []).map(nm).join(', ') || '-'],
      ];
    }
    return [
      ['City and preference', l.city],
      ['Primary role', nm(a.primary_role)],
      ['Experience', a.experience],
      ['License', nm(a.license_status)],
      ['Documents', (a.documents || []).map(nm).join(', ') || '-'],
    ];
  };

  const summaryOf = (l) => {
    const a = l.answers || {};
    return l.kind === 'owner' ? (a.equipment || []).map(nm).join(', ') : `${nm(a.primary_role)} · ${nm(a.license_status)}`;
  };

  const exportCsv = async () => {
    try {
      const all = [];
      for (let p = 0; p < 50; p += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await apiRequest('/admin/leads/list', { method: 'POST', body: { ...query(filters, 0), min: p * 100, max: p * 100 + 100 } });
        all.push(...(res.data || []));
        if ((res.data || []).length < 100) break;
      }
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const head = ['Date', 'Type', 'Name', 'Mobile', 'Place', 'Details', 'Status', 'Note'];
      const lines = all.map((l) => [when(l.created_at), l.kind, l.full_name, l.mobile_number, l.city, detailRows(l).slice(1).map(([k, v]) => `${k}: ${v}`).join(' | '), l.status, l.note].map(esc).join(','));
      const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cranezo-join-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader title="Join requests" subtitle="Crane owners and operators who filled in the form on the website. Call them, then mark what happened.">
        <button type="button" className="cranezo-btn-secondary" onClick={exportCsv}>Download CSV</button>
      </PageHeader>
      <ErrorBox message={error} />
      <OkBox message={ok} />
      {summary && <Stats items={[{ label: 'All requests', value: summary.total }, { label: 'Crane owners', value: summary.owners }, { label: 'Operators', value: summary.operators }, { label: 'New (not called yet)', value: summary.new }]} />}

      <Section title="Filter">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div>
            <span style={label}>Who</span>
            <select style={input} value={filters.kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Owners and operators</option>
              <option value="owner">Crane owners</option>
              <option value="operator">Operators</option>
            </select>
          </div>
          <div>
            <span style={label}>Status</span>
            <select style={input} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="">All</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Search name, mobile or place</span>
            <input style={input} value={filters.search} onChange={(e) => set({ search: e.target.value })} placeholder="e.g. Kakinada" />
          </div>
          {filters.kind === 'owner' && opts && (
            <>
              <div>
                <span style={label}>Equipment owned</span>
                <select style={input} value={filters.equipment} onChange={(e) => set({ equipment: e.target.value })}>
                  <option value="">Any</option>
                  {opts.owner.equipment.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <span style={label}>Supplies operators</span>
                <select style={input} value={filters.supplies_operators} onChange={(e) => set({ supplies_operators: e.target.value })}>
                  <option value="">Any</option>
                  {opts.owner.operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </>
          )}
          {filters.kind === 'operator' && opts && (
            <>
              <div>
                <span style={label}>Primary role</span>
                <select style={input} value={filters.primary_role} onChange={(e) => set({ primary_role: e.target.value })}>
                  <option value="">Any</option>
                  {opts.operator.roles.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <span style={label}>License</span>
                <select style={input} value={filters.license_status} onChange={(e) => set({ license_status: e.target.value })}>
                  <option value="">Any</option>
                  {opts.operator.license.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title={`${total} request${total === 1 ? '' : 's'}`}>
        <Table
          headers={['Date', 'Type', 'Name', 'Mobile', 'Place', 'Details', 'Status']}
          empty="No requests match."
          minWidth={900}
          onRow={(i) => { setOpen(rows[i]); setNote(rows[i].note || ''); setOk(''); }}
          rows={rows.map((l) => [
            when(l.created_at), l.kind === 'owner' ? 'Owner' : 'Operator', l.full_name,
            <a key="m" href={`tel:+91${l.mobile_number}`} onClick={(e) => e.stopPropagation()} style={{ color: '#f59e0b' }}>{l.mobile_number}</a>,
            l.city, summaryOf(l), <Badge key="s" tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>,
          ])}
        />
        <Pager page={page} size={PAGE} total={total} onPage={setPage} />
      </Section>

      {open && (
        <Section title={`${open.full_name} · ${open.kind === 'owner' ? 'Crane owner' : 'Operator'}`} right={<button type="button" className="cranezo-btn-secondary" onClick={() => setOpen(null)}>Close</button>}>
          <div style={{ display: 'grid', gap: 8, fontSize: 13, marginBottom: 14 }}>
            <div><span style={{ color: 'var(--dash-text-subtle)' }}>Mobile / WhatsApp: </span><a href={`tel:+91${open.mobile_number}`} style={{ color: '#f59e0b' }}>{open.mobile_number}</a> · <a href={`https://wa.me/91${open.mobile_number}`} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e' }}>WhatsApp</a></div>
            {detailRows(open).map(([k, v]) => (
              <div key={k}><span style={{ color: 'var(--dash-text-subtle)' }}>{k}: </span><span style={{ color: 'var(--dash-text-body)' }}>{v || '-'}</span></div>
            ))}
            <div><span style={{ color: 'var(--dash-text-subtle)' }}>Sent: </span>{when(open.created_at)}</div>
          </div>
          <span style={label}>Status</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <button key={k} type="button" className={open.status === k ? 'cranezo-btn-primary-amber' : 'cranezo-btn-secondary'} onClick={() => update(open, { status: k })}>{v}</button>
            ))}
          </div>
          <span style={label}>Note</span>
          <textarea style={{ ...input, minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was said on the call" />
          <div style={{ marginTop: 10 }}>
            <button type="button" className="cranezo-btn-primary-amber" onClick={() => update(open, { note })}>Save note</button>
          </div>
        </Section>
      )}
    </div>
  );
};

export default Leads;
