import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, Badge, ErrorBox, Pager, input, label, inr, when } from './financeUi';

const SIZE = 20;
const STATUS_TONE = { success: 'good', initiated: 'warn', failed: 'bad', refunded: 'warn' };

/** Admin > Payments: every customer payment (cash or online) in one ledger */
export const Payments = () => {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ status: '', method: '', search: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const body = { min: page * SIZE, max: (page + 1) * SIZE };
      if (filters.status) body.status = filters.status;
      if (filters.method) body.method = filters.method;
      if (filters.search.trim()) body.search = filters.search.trim();
      const [list, sum] = await Promise.all([
        apiRequest('/admin/finance/transactions', { method: 'POST', body }),
        apiRequest('/admin/finance/transactions/summary', { method: 'POST' }),
      ]);
      setRows(list.data);
      setTotal(list.pagination ? list.pagination.total : list.data.length);
      setSummary(sum.data);
    } catch (err) {
      setError(err.message);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (patch) => {
    setPage(0);
    setFilters({ ...filters, ...patch });
  };

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader title="Payments" subtitle="Every customer payment. Cash is collected on site by the owner; online payments land in the platform account." />
      <ErrorBox message={error} />

      {summary && (
        <Stats
          items={[
            { label: 'Total collected', value: inr(summary.total_collected), hint: `${summary.transactions} transactions` },
            { label: 'Cash with owners', value: inr(summary.cash_with_owners), hint: 'Owners owe the platform fee on these' },
            { label: 'In platform account', value: inr(summary.in_platform_account), hint: 'Owed to owners after the fee' },
            { label: 'Failed payments', value: summary.failed_count, color: summary.failed_count ? '#ef4444' : undefined },
          ]}
        />
      )}

      <Section title="Transactions">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Search</label>
            <input style={input} placeholder="Transaction or booking code" value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} />
          </div>
          <div>
            <label style={label}>Status</label>
            <select className="cranzo-select-dropdown" style={{ width: '100%' }} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="">All</option>
              <option value="success">Successful</option>
              <option value="initiated">Processing</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label style={label}>Method</label>
            <select className="cranzo-select-dropdown" style={{ width: '100%' }} value={filters.method} onChange={(e) => setFilter({ method: e.target.value })}>
              <option value="">All</option>
              <option value="COD">Cash on Delivery</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Net Banking</option>
            </select>
          </div>
        </div>
        <Table
          headers={['Date', 'Transaction', 'Booking', 'Customer', 'Owner', 'Method', 'Amount', 'Money is with', 'Status']}
          rows={rows.map((t) => [
            when(t.created_at),
            t.transaction_code,
            t.booking_code || '-',
            t.customer ? t.customer.name : '-',
            t.owner ? t.owner.name : '-',
            t.method_name,
            <strong key="a">{inr(t.amount)}</strong>,
            t.collected_by_label,
            <Badge key="s" tone={STATUS_TONE[t.status]}>{t.status_label}</Badge>,
          ])}
          empty="No payments yet."
          minWidth={900}
        />
        <Pager page={page} size={SIZE} total={total} onPage={setPage} />
      </Section>
    </div>
  );
};

export default Payments;
