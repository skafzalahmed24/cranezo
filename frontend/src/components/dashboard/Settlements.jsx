import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, Badge, ErrorBox, OkBox, Pager, input, label, muted, inr, day, when } from './financeUi';

const SIZE = 20;
const netColor = (n) => (n > 0 ? '#3b82f6' : n < 0 ? '#f59e0b' : 'var(--dash-text-muted)');

/**
 * Admin > Settlements.
 * Cash jobs: the owner collected the money, so the owner pays the platform its fee.
 * Online jobs: the platform holds the money, so the platform pays the owner the rest.
 */
export const Settlements = () => {
  const [tab, setTab] = useState('due'); // due | history
  const [balances, setBalances] = useState(null);
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState(null); // selected owner row
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBalances = useCallback(async () => {
    setError('');
    try {
      const res = await apiRequest('/admin/finance/settlements/balances', { method: 'POST', body: search.trim() ? { search: search.trim() } : {} });
      setBalances(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, [search]);

  useEffect(() => {
    if (tab === 'due' && !owner) loadBalances();
  }, [tab, owner, loadBalances]);

  if (owner) {
    return (
      <OwnerSettlement
        owner={owner}
        methods={balances ? balances.payout_methods : []}
        onBack={() => setOwner(null)}
        onDone={(msg) => {
          setNotice(msg);
          setOwner(null);
        }}
      />
    );
  }

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader
        title="Settlements"
        subtitle="Settle money between the platform and crane owners. Cash jobs: collect the platform fee. Online jobs: pay the owner their share."
      />
      <ErrorBox message={error} />
      <OkBox message={notice} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={tab === 'due' ? 'cranezo-btn-primary-amber' : 'cranezo-btn-secondary'} onClick={() => setTab('due')}>Due now</button>
        <button type="button" className={tab === 'history' ? 'cranezo-btn-primary-amber' : 'cranezo-btn-secondary'} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'history' ? (
        <History />
      ) : (
        <>
          {balances && (
            <Stats
              items={[
                { label: 'Platform fee', value: `${balances.platform_fee_percent}%`, hint: 'Of the job amount before GST' },
                { label: 'Collect from owners', value: inr(balances.totals.collect_from_owners), color: '#f59e0b', hint: 'Fees on cash jobs' },
                { label: 'Pay to owners', value: inr(balances.totals.pay_to_owners), color: '#3b82f6', hint: 'Online payments held by the platform' },
                { label: 'Owners with dues', value: balances.totals.owners },
              ]}
            />
          )}
          <Section
            title="Owners with unsettled jobs"
            right={<input style={{ ...input, width: 240 }} placeholder="Search owner name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />}
          >
            <Table
              headers={['Owner', 'Member ID', 'Jobs', 'Owner owes platform', 'Platform owes owner', 'Net', 'Oldest job', '']}
              rows={(balances ? balances.items : []).map((r) => [
                <strong key="n">{r.owner.name || '-'}</strong>,
                r.owner.member_id || '-',
                r.jobs,
                inr(r.owner_owes_platform),
                inr(r.platform_owes_owner),
                <span key="net" style={{ color: netColor(r.net), fontWeight: 700 }}>{r.net_label}: {inr(Math.abs(r.net))}</span>,
                day(r.oldest_job_at),
                <button key="b" type="button" className="cranezo-btn-secondary" onClick={() => { setNotice(''); setOwner(r); }}>Settle</button>,
              ])}
              empty="Nothing to settle. Every paid job is settled."
              minWidth={900}
            />
          </Section>
        </>
      )}
    </div>
  );
};

/** One owner: tick the jobs, enter how the money moved, record it */
const OwnerSettlement = ({ owner, methods, onBack, onDone }) => {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ method: 'bank_transfer', reference: '', note: '', settled_at: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest('/admin/finance/settlements/pending', { method: 'POST', body: { owner_id: owner.owner.id } });
        setData(res.data);
        setSelected(res.data.items.filter((i) => i.payment_status === 'paid').map((i) => i.booking_id));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [owner]);

  const items = data ? data.items : [];
  const chosen = items.filter((i) => selected.includes(i.booking_id));
  const net = Math.round(chosen.reduce((s, i) => s + i.platform_balance, 0) * 100) / 100;
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { owner_id: owner.owner.id, booking_ids: selected, method: form.method, reference: form.reference, note: form.note };
      if (form.settled_at) body.settled_at = new Date(form.settled_at).toISOString();
      const res = await apiRequest('/admin/finance/settlements/settle', { method: 'POST', body });
      onDone(`Recorded ${res.data.settlement_code}: ${res.data.direction_label}, ${inr(res.data.amount)} for ${res.data.jobs_count} job(s).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cranezo-content-view animate-fade-in">
      <button type="button" className="cranezo-btn-secondary" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={15} /> Back to settlements
      </button>
      <PageHeader title={`Settle with ${owner.owner.name || 'owner'}`} subtitle={`Member ID ${owner.owner.member_id || '-'}. Only jobs the customer has paid can be settled.`} />
      <ErrorBox message={error} />

      <Section title="1. Choose the jobs">
        <Table
          headers={['', 'Job', 'Completed', 'Customer paid', 'Paid by', 'Platform fee', 'Owner gets', 'Settlement']}
          rows={items.map((i) => {
            const paid = i.payment_status === 'paid';
            return [
              <input key="c" type="checkbox" disabled={!paid} checked={selected.includes(i.booking_id)} onChange={() => toggle(i.booking_id)} />,
              <strong key="j">{i.booking_code}</strong>,
              day(i.completed_at),
              paid ? inr(i.customer_total) : <Badge key="u" tone="bad">Not paid yet</Badge>,
              paid ? (i.collected_by === 'owner' ? 'Cash (owner)' : 'Online (platform)') : '-',
              inr(i.platform_fee),
              inr(i.owner_receives),
              <span key="b" style={{ color: netColor(i.platform_balance), fontWeight: 600 }}>
                {i.platform_balance < 0 ? `Owner pays ${inr(-i.platform_balance)}` : i.platform_balance > 0 ? `Pay owner ${inr(i.platform_balance)}` : '-'}
              </span>,
            ];
          })}
          empty="No unsettled jobs."
          minWidth={900}
        />
        <div style={{ marginTop: 12, fontSize: 15, fontWeight: 700, color: netColor(net) }}>
          {chosen.length} job(s) selected.{' '}
          {net > 0 ? `Platform pays the owner ${inr(net)}.` : net < 0 ? `Owner pays the platform ${inr(-net)}.` : 'Nothing to pay either way.'}
        </div>
      </Section>

      <Section title="2. How was it paid?">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label style={label}>Method</label>
            <select className="cranezo-select-dropdown" style={{ width: '100%' }} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Reference {form.method !== 'cash' && '*'}</label>
            <input style={input} placeholder="UTR / UPI ref / cheque no." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div>
            <label style={label}>Paid on (blank = now)</label>
            <input type="datetime-local" style={input} value={form.settled_at} onChange={(e) => setForm({ ...form, settled_at: e.target.value })} />
          </div>
        </div>
        <label style={{ ...label, marginTop: 12 }}>Note (optional)</label>
        <textarea style={{ ...input, minHeight: 60 }} value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="cranezo-btn-primary-amber" disabled={saving || !chosen.length} onClick={save}>
            {saving ? 'Saving...' : 'Record settlement'}
          </button>
          <span style={muted}>The owner gets a notification. This cannot be undone from the panel.</span>
        </div>
      </Section>
    </div>
  );
};

const History = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState('platform_owner');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest('/admin/finance/settlements', { method: 'POST', body: { min: page * SIZE, max: (page + 1) * SIZE, kind } });
        setRows(res.data);
        setTotal(res.pagination ? res.pagination.total : res.data.length);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [page, kind]);

  return (
    <Section
      title="Settlement history"
      right={(
        <select className="cranezo-select-dropdown" value={kind} onChange={(e) => { setPage(0); setKind(e.target.value); }}>
          <option value="platform_owner">Platform and owners</option>
          <option value="owner_operator">Owners and operators</option>
        </select>
      )}
    >
      <ErrorBox message={error} />
      <Table
        headers={['Paid on', 'Code', 'Owner', kind === 'owner_operator' ? 'Operator' : 'Direction', 'Jobs', 'Amount', 'Method', 'Reference']}
        rows={rows.map((s) => [
          when(s.settled_at),
          s.settlement_code,
          s.owner ? s.owner.name : '-',
          kind === 'owner_operator' ? (s.operator ? s.operator.name : '-') : s.direction_label,
          s.jobs_count,
          <strong key="a">{inr(s.amount)}</strong>,
          s.method_label,
          s.reference || '-',
        ])}
        empty="No settlements recorded yet."
        minWidth={900}
      />
      <Pager page={page} size={SIZE} total={total} onPage={setPage} />
    </Section>
  );
};

export default Settlements;
