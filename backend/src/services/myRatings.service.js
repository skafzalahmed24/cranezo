/**
 * "My ratings": the feedback customers gave, for the person who received it.
 *   operator -> the ratings of the jobs they drove
 *   owner    -> the ratings of the jobs done with their cranes
 * Shows the stars, the written feedback, the job and the customer's first name (never the customer's phone number).
 */
const { fn, col } = require('sequelize');
const { BookingRating, Booking, Crane, User } = require('../models');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');

const OPERATOR_ROLE = 2;

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Customer';

class MyRatingsService {
  /** The person's own average and how many ratings of each star count */
  async summary(userId, key) {
    const rows = await BookingRating.findAll({
      where: { [key]: userId },
      attributes: ['rating', [fn('COUNT', col('id')), 'n']],
      group: ['rating'],
      raw: true
    });
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    rows.forEach((r) => {
      const n = Number(r.n);
      breakdown[r.rating] = n;
      total += n;
      sum += n * Number(r.rating);
    });
    return { average: total ? Math.round((sum / total) * 10) / 10 : null, total, breakdown };
  }

  async list(user, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const key = user.roleId === OPERATOR_ROLE ? 'operatorId' : 'ownerId';
    const stars = input.stars === undefined || input.stars === '' ? null : Number(input.stars);
    if (stars !== null && (!Number.isInteger(stars) || stars < 1 || stars > 5)) throw new ServiceError('stars must be 1 to 5.');

    const where = { [key]: user.id };
    if (stars) where.rating = stars;
    const { rows, count } = await BookingRating.findAndCountAll({
      where,
      include: [{
        model: Booking,
        as: 'booking',
        attributes: ['id', 'bookingCode', 'startAt', 'completedAt'],
        include: [
          { model: User, as: 'customer', attributes: ['id', 'fullName', 'profileImage'] },
          { model: Crane, as: 'crane', attributes: ['id', 'craneCode', 'modelName'] }
        ]
      }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: range.limit,
      offset: range.offset,
      distinct: true
    });

    const items = rows.map((r) => {
      const b = r.booking || {};
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment || null,
        created_at: r.createdAt,
        booking_id: b.id || r.bookingId,
        booking_code: b.bookingCode || null,
        job_date: b.completedAt || b.startAt || null,
        customer_name: firstName(b.customer && b.customer.fullName),
        customer_photo: (b.customer && b.customer.profileImage) || null,
        crane_code: (b.crane && b.crane.craneCode) || null,
        crane_name: (b.crane && b.crane.modelName) || null
      };
    });
    return { range, items, total: count, summary: await this.summary(user.id, key) };
  }
}

module.exports = { myRatingsService: new MyRatingsService() };
