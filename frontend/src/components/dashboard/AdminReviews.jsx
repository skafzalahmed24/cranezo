import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Stats, Table, ErrorBox, Pager, muted, when } from './financeUi';

const SIZE = 20;
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Admin > Reviews: every rating customers gave after a job */
export const AdminReviews = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rating, setRating] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const body = { min: page * SIZE, max: (page + 1) * SIZE };
      if (rating) body.rating = rating;
      const res = await apiRequest('/admin/reviews', { method: 'POST', body });
      setRows(res.data);
      setSummary(res.summary);
      setTotal(res.pagination ? res.pagination.total : res.data.length);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [page, rating]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="cranezo-content-view animate-fade-in">
      <PageHeader title="Reviews" subtitle="Ratings and comments customers left after a job." />
      <ErrorBox message={error} />
      {summary && (
        <Stats
          items={[
            { label: 'Average rating', value: summary.average !== null ? `${summary.average} / 5` : '-' },
            { label: 'Total reviews', value: summary.count },
            ...summary.by_stars.map((s) => ({ label: `${s.stars} star`, value: s.count })),
          ]}
        />
      )}
      <Section
        title="All reviews"
        right={(
          <select className="cranezo-select-dropdown" value={rating} onChange={(e) => { setPage(0); setRating(e.target.value); }}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} star</option>)}
          </select>
        )}
      >
        <Table
          headers={['When', 'Booking', 'Rating', 'Comment', 'Customer', 'Owner', 'Operator']}
          rows={rows.map((r) => [
            when(r.created_at),
            <strong key="b">{r.booking_code || '-'}</strong>,
            <span key="r" style={{ color: '#f59e0b', whiteSpace: 'nowrap' }}>{stars(r.rating)}</span>,
            r.comment || <span key="c" style={muted}>No comment</span>,
            r.customer ? r.customer.name : '-',
            r.owner ? r.owner.name : '-',
            r.operator ? r.operator.name : '-',
          ])}
          empty="No reviews yet."
          minWidth={900}
        />
        <Pager page={page} size={SIZE} total={total} onPage={setPage} />
      </Section>
    </div>
  );
};

export default AdminReviews;
