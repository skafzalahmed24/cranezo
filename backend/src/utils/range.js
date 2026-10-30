const DEFAULT_MIN = 0;
const DEFAULT_MAX = 10;
const MAX_WINDOW = 100;

/**
 * Reads the min/max range from a request payload.
 * min = index of the first record (default 0), max = index after the last one (default 10),
 * so { min: 0, max: 10 } is the first 10 records and { min: 10, max: 20 } the next 10.
 * Returns { min, max, offset, limit } or { error }.
 */
const parseRange = (input = {}) => {
  const read = (value, fallback) => (value === undefined || value === null || value === '' ? fallback : Number(value));
  const min = read(input.min, DEFAULT_MIN);
  const max = read(input.max, DEFAULT_MAX);

  if (!Number.isInteger(min) || !Number.isInteger(max)) return { error: 'min and max must be whole numbers.' };
  if (min < 0) return { error: 'min cannot be negative.' };
  if (max <= min) return { error: 'max must be greater than min.' };
  if (max - min > MAX_WINDOW) return { error: `The range between min and max cannot exceed ${MAX_WINDOW}.` };

  return { min, max, offset: min, limit: max - min };
};

/** Standard list response: data + { min, max, count, total, has_more } */
const rangeResponse = (res, message, items, { min, max }, total) => res.status(200).json({
  status: 1,
  message,
  data: items,
  pagination: {
    min,
    max,
    count: items.length,
    total,
    has_more: max < total
  },
  timestamp: new Date().toISOString()
});

module.exports = { parseRange, rangeResponse, DEFAULT_MIN, DEFAULT_MAX, MAX_WINDOW };
