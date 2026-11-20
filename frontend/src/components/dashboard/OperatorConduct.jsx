import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Table, Badge, ErrorBox, OkBox, input, label, inr, when } from './financeUi';

/** Admin > Operator conduct: who needs attention, yellow and red cards, the reinstall penalty. Super Admin gives cards. */
const OperatorConduct = () => {
  const [attention, setAttention] = useState(null);
  const [rules, setRules] = useState(null);
  const [lookup, setLookup] = useState('');
  const [detail, setDetail] = useState(null);
  const [card, setCard] = useState({ kind: 'yellow', reason: '', penalty_amount: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([apiRequest('/admin/conduct/attention', { method: 'POST', body: {} }), apiRequest('/admin/conduct/rules', { method: 'POST', body: {} })]);
      setAttention(a.data);
      setRules({ inactive_days: String(r.data.inactive_days), reinstall_penalty: String(r.data.reinstall_penalty) });
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setOk('');
    try {
      await fn();
      if (message) setOk(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const open = (id) => run(async () => {
    const res = await apiRequest('/admin/conduct/operator', { method: 'POST', body: { operator_id: id } });
    setDetail(res.data);
    setLookup(res.data.operator.member_id || id);
  });

  const give = () => run(async () => {
    const res = await apiRequest('/admin/conduct/card', { method: 'POST', body: { operator_id: detail.operator.id, ...card, penalty_amount: card.penalty_amount === '' ? 0 : Number(card.penalty_amount) } });
    setDetail(res.data);
    setCard({ kind: 'yellow', reason: '', penalty_amount: '' });
    load();
  }, 'Card given. The operator (and their owner) were told.');

  const clear = () => run(async () => {
    const res = await apiRequest('/admin/conduct/clear', { method: 'POST', body: { operator_id: detail.operator.id } });
    setDetail(res.data);
    load();
  }, 'Restriction cleared. The operator can take jobs again.');

  const saveRules = () => run(async () => {
    await apiRequest('/admin/conduct/rules/save', { method: 'POST', body: { inactive_days: Number(rules.inactive_days), reinstall_penalty: Number(rules.reinstall_penalty) } });
    load();
  }, 'Rules saved.');

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader title="Operator conduct" subtitle="Yellow cards warn, red cards restrict an operator until you clear them. Only the Super Admin gives and clears cards." />
      <ErrorBox message={error} />
      <OkBox message={ok} />

      <Section title="Needs attention">
        <Table
          headers={['Operator', 'ID', 'Why', 'Last active', '']}
          empty="Nobody needs attention."
          rows={(attention ? attention.items : []).map((o) => [
            o.name || '-', o.member_id, <Badge key="b" tone={o.reason === 'app_removed' ? 'bad' : 'warn'}>{o.reason_label}</Badge>, when(o.last_active_at),
            <button key="x" type="button" className="cranezo-btn-secondary" onClick={() => open(o.id)}>Open</button>,
          ])}
        />
      </Section>

      <Section title="Find an operator">
        <div style={{ display: 'flex', gap: 10, maxWidth: 460 }}>
          <input style={input} placeholder="Operator ID, e.g. OP754197" value={lookup} onChange={(e) => setLookup(e.target.value.toUpperCase())} />
          <button type="button" className="cranezo-btn-secondary" disabled={busy || lookup.length < 4} onClick={() => open(lookup)}>Open</button>
        </div>
      </Section>

      {detail && (
        <Section title={`${detail.operator.name || 'Operator'} · ${detail.operator.member_id}`}>
          <p style={{ margin: '0 0 12px', color: 'var(--dash-text-muted)', fontSize: 13 }}>
            Yellow cards: <strong>{detail.yellow}</strong> · Red cards: <strong>{detail.red}</strong> · Last active {when(detail.last_active_at)}
            {detail.app_removed_at ? ` · Removed the app ${when(detail.app_removed_at)}` : ''}
          </p>
          {detail.blocked && (
            <div style={{ marginBottom: 14 }}>
              <Badge tone="bad">Restricted</Badge> <span style={{ fontSize: 13 }}>Penalty due {inr(detail.penalty_due)}</span>{' '}
              <button type="button" className="cranezo-btn-secondary" disabled={busy} onClick={clear}>Penalty paid: clear restriction</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <span style={label}>Card</span>
              <select style={input} value={card.kind} onChange={(e) => setCard({ ...card, kind: e.target.value })}>
                <option value="yellow">Yellow (warning)</option>
                <option value="red">Red (restrict until cleared)</option>
              </select>
            </div>
            <div>
              <span style={label}>Penalty (₹, optional)</span>
              <input style={input} inputMode="decimal" value={card.penalty_amount} onChange={(e) => setCard({ ...card, penalty_amount: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
          </div>
          <span style={label}>Reason (the operator reads this)</span>
          <textarea style={{ ...input, minHeight: 70 }} value={card.reason} onChange={(e) => setCard({ ...card, reason: e.target.value })} />
          <div style={{ marginTop: 10 }}>
            <button type="button" className="cranezo-btn-primary-amber" disabled={busy || card.reason.trim().length < 5} onClick={give}>Give {card.kind} card</button>
          </div>
          <div style={{ marginTop: 16 }}>
            <Table
              headers={['Date', 'Card', 'Reason', 'Penalty', 'Status']}
              empty="No cards yet."
              rows={detail.cards.map((c) => [when(c.created_at), <Badge key="k" tone={c.kind === 'red' ? 'bad' : 'warn'}>{c.kind}</Badge>, c.reason, inr(c.penalty_amount), c.cleared ? 'Cleared' : (c.kind === 'red' ? 'Active' : 'Warning')])}
            />
          </div>
        </Section>
      )}

      {rules && (
        <Section title="Rules">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 560 }}>
            <div>
              <span style={label}>Needs attention after (days quiet)</span>
              <input style={input} inputMode="numeric" value={rules.inactive_days} onChange={(e) => setRules({ ...rules, inactive_days: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <span style={label}>Penalty to come back after removing the app (₹)</span>
              <input style={input} inputMode="decimal" value={rules.reinstall_penalty} onChange={(e) => setRules({ ...rules, reinstall_penalty: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
          </div>
          <p style={{ color: 'var(--dash-text-muted)', fontSize: 12.5 }}>With a penalty above 0, an operator who removes the app and signs in again gets a yellow card and is restricted until you clear it.</p>
          <button type="button" className="cranezo-btn-primary-amber" disabled={busy} onClick={saveRules}>Save rules</button>
        </Section>
      )}
    </div>
  );
};

export default OperatorConduct;
