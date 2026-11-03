const { Op } = require('sequelize');
const { Booking, JobRequest, User, StaticDropdown } = require('../models');
const { BOOKING_STATUS, NOTIFICATION_TYPES } = require('../constants/booking');
const { parseRange } = require('../utils/range');
const { ServiceError } = require('./crane.service');
const { notificationService } = require('./notification.service');
const { bookingHelpers: H } = require('./booking.service');
const { jobService } = require('./job.service');
const billing = require('./billing');

const STATUS = { PENDING: 0, ACCEPTED: 1, REJECTED: 2, WITHDRAWN: 3, CLOSED: 4 };
const STATUS_LABELS = { 0: 'Waiting for owner', 1: 'Accepted', 2: 'Rejected', 3: 'Withdrawn', 4: 'Job given to another operator' };
const ACTIVE_JOB = [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS];
const SEARCH_RADIUS_KM = 50;

const requestView = (r) => ({
  id: r.id,
  booking_id: r.bookingId,
  booking_code: r.booking ? r.booking.bookingCode : null,
  status: r.status,
  status_label: STATUS_LABELS[r.status],
  message: r.message,
  reject_reason: r.rejectReason,
  requested_at: H.iso(r.createdAt),
  responded_at: H.iso(r.respondedAt)
});

class JobRequestService {
  async operator(operatorId) {
    const op = await User.findOne({
      where: { id: operatorId, roleId: 2, isDeleted: 0 },
      attributes: ['id', 'ownerId', 'isActive', 'operatorLicenseStatus', 'operatorLicenseFront', 'licenseExpiryDate', 'fullName']
    });
    if (!op) throw new ServiceError('Operator not found.', 404);
    return op;
  }

  /** Bookings the owner confirmed but has not given to any operator yet, that this operator may ask for */
  openJobsWhere(op) {
    const where = {
      status: BOOKING_STATUS.CONFIRMED,
      operatorId: null,
      enRouteAt: null,
      startAt: { [Op.gt]: new Date(Date.now() - 3600 * 1000) }
    };
    // an operator who works for an owner only sees that owner's jobs; independent operators see everyone's
    if (op.ownerId) where.ownerId = op.ownerId;
    return where;
  }

  /** Available Jobs (operator app) */
  async available(operatorId, input = {}) {
    const op = await this.operator(operatorId);
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const hasCoords = input.latitude !== undefined && input.longitude !== undefined && input.latitude !== null && input.longitude !== null;
    const lat = Number(input.latitude);
    const lng = Number(input.longitude);
    if (hasCoords && (!Number.isFinite(lat) || !Number.isFinite(lng))) throw new ServiceError('latitude and longitude must be numbers.');

    const busy = await Booking.findAll({
      where: { operatorId, status: { [Op.in]: [BOOKING_STATUS.CONFIRMED, ...ACTIVE_JOB] } },
      attributes: ['startAt', 'endAt']
    });
    const rows = await Booking.findAll({
      where: this.openJobsWhere(op),
      include: [...H.bookingInclude, { model: JobRequest, as: 'jobRequests', required: false, where: { operatorId }, attributes: ['id', 'status', 'createdAt', 'respondedAt', 'message', 'rejectReason', 'bookingId'] }],
      order: [['startAt', 'ASC']],
      limit: 300
    });

    const settingsCache = new Map();
    const items = [];
    for (const b of rows) {
      const clash = busy.some((j) => new Date(j.startAt) < new Date(b.endAt) && new Date(j.endAt) > new Date(b.startAt));
      if (clash) continue;
      const distance = hasCoords ? H.round1(H.haversineKm(lat, lng, Number(b.latitude), Number(b.longitude))) : null;
      if (distance !== null && distance > SEARCH_RADIUS_KM) continue;
      if (!settingsCache.has(b.ownerId)) settingsCache.set(b.ownerId, await billing.ownerSettings(b.ownerId)); // eslint-disable-line no-await-in-loop
      const s = settingsCache.get(b.ownerId);
      const preview = billing.billOf({
        ...b.get({ plain: true }),
        operatorCommissionType: s.default_commission_type,
        operatorCommissionValue: s.default_commission_value,
        completedAt: null
      }).operator_commission;
      const mine = (b.jobRequests || [])[0];
      items.push({
        booking_id: b.id,
        booking_code: b.bookingCode,
        crane_label: H.craneTitle(b.crane),
        crane_photo: H.primaryPhoto(b.crane),
        owner_name: b.owner ? b.owner.companyName || b.owner.fullName : null,
        site: { name: b.siteName, address: b.siteAddress, latitude: H.num(b.latitude), longitude: H.num(b.longitude) },
        distance_km: distance,
        start_at: H.iso(b.startAt),
        end_at: H.iso(b.endAt),
        duration_label: H.durationLabel(b),
        expected_earnings: preview.set && preview.value > 0 ? preview.amount : null,
        expected_earnings_label: preview.set && preview.value > 0
          ? `${preview.type_label}: ${preview.type === 'percent' ? `${preview.value}%` : `₹${preview.value}`}`
          : 'Owner will confirm your earnings',
        my_request: mine ? requestView({ ...mine.get({ plain: true }), booking: b }) : null,
        can_request: !mine || mine.status === STATUS.WITHDRAWN
      });
    }
    if (hasCoords) items.sort((a, b) => a.distance_km - b.distance_km);
    return { range, items: items.slice(range.offset, range.offset + range.limit), total: items.length };
  }

  /** Send Request to the owner */
  async request(operatorId, input = {}) {
    const op = await this.operator(operatorId);
    if (op.isActive !== 0) throw new ServiceError('Your account is not active.', 403);
    if (!op.operatorLicenseFront || op.operatorLicenseStatus === 2) {
      throw new ServiceError('Upload a valid operator license before requesting jobs.', 409);
    }
    if (!H.UUID_RE.test(String(input.booking_id || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findOne({ where: { id: input.booking_id, ...this.openJobsWhere(op) } });
    if (!b) throw new ServiceError('This job is no longer open.', 409);

    const message = input.message ? String(input.message).trim().slice(0, 300) : null;
    const existing = await JobRequest.findOne({ where: { bookingId: b.id, operatorId } });
    let row;
    if (existing) {
      if (existing.status !== STATUS.WITHDRAWN) throw new ServiceError('You have already requested this job.', 409);
      row = await existing.update({ status: STATUS.PENDING, message, rejectReason: null, respondedAt: null });
    } else {
      row = await JobRequest.create({ bookingId: b.id, operatorId, ownerId: b.ownerId, message });
    }
    await notificationService.notify(b.ownerId, {
      type: 'operator_job_request',
      title: 'Operator Wants a Job',
      body: `${op.fullName || 'An operator'} asked to take ${b.bookingCode}.`,
      data: { booking_id: b.id, booking_code: b.bookingCode, request_id: row.id }
    });
    return requestView({ ...row.get({ plain: true }), booking: b });
  }

  async withdraw(operatorId, requestId) {
    if (!H.UUID_RE.test(String(requestId || ''))) throw new ServiceError('A valid request_id is required.');
    const row = await JobRequest.findOne({ where: { id: requestId, operatorId }, include: [{ model: Booking, as: 'booking', attributes: ['id', 'bookingCode'] }] });
    if (!row) throw new ServiceError('Request not found.', 404);
    if (row.status !== STATUS.PENDING) throw new ServiceError('Only a waiting request can be withdrawn.', 409);
    await row.update({ status: STATUS.WITHDRAWN, respondedAt: new Date() });
    return requestView(row);
  }

  async operatorRequests(operatorId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const { rows, count } = await JobRequest.findAndCountAll({
      where: { operatorId },
      include: [{ model: Booking, as: 'booking', attributes: ['id', 'bookingCode', 'siteName', 'siteAddress', 'startAt'] }],
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return {
      range,
      items: rows.map((r) => ({
        ...requestView(r),
        location: r.booking ? r.booking.siteName || r.booking.siteAddress : null,
        start_at: r.booking ? H.iso(r.booking.startAt) : null
      })),
      total: count
    };
  }

  // ---------------------------------------------------------------- owner

  async ownerRequests(ownerId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const where = { ownerId };
    const status = input.status === undefined || input.status === null || input.status === '' ? STATUS.PENDING : Number(input.status);
    if (input.status !== 'all') {
      if (!STATUS_LABELS[status]) throw new ServiceError('status is not valid.');
      where.status = status;
    }
    if (input.booking_id) where.bookingId = input.booking_id;
    const { rows, count } = await JobRequest.findAndCountAll({
      where,
      include: [
        { model: Booking, as: 'booking', attributes: ['id', 'bookingCode', 'siteName', 'siteAddress', 'startAt', 'endAt', 'durationType', 'durationHours', 'durationDays'] },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'fullName', 'memberId', 'profileImage', 'mobileNumber', 'countryCode', 'ratingAverage', 'ratingCount', 'ownerId', 'operatorLicenseStatus', 'licenseExpiryDate'],
          include: [{ model: StaticDropdown, as: 'experienceInfo', attributes: ['id', 'dropdownName'] }]
        }
      ],
      limit: range.limit,
      offset: range.offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return {
      range,
      items: rows.map((r) => ({
        ...requestView(r),
        job: r.booking ? {
          booking_id: r.booking.id,
          booking_code: r.booking.bookingCode,
          location: r.booking.siteName || r.booking.siteAddress,
          start_at: H.iso(r.booking.startAt),
          duration_label: H.durationLabel(r.booking)
        } : null,
        operator: r.operator ? {
          id: r.operator.id,
          full_name: r.operator.fullName,
          member_id: r.operator.memberId,
          profile_image: r.operator.profileImage,
          // contact is shared so the owner can call before accepting
          mobile_number: r.operator.mobileNumber,
          country_code: r.operator.countryCode,
          rating: H.ratingOf(r.operator),
          reviews_count: r.operator.ratingCount || 0,
          experience: r.operator.experienceInfo ? r.operator.experienceInfo.dropdownName : null,
          license_verified: r.operator.operatorLicenseStatus === 1,
          independent: !r.operator.ownerId
        } : null
      })),
      total: count
    };
  }

  /** Accept: the operator gets the job (already accepted on their side). Reject: they are told. */
  async respond(ownerId, input = {}) {
    if (!H.UUID_RE.test(String(input.request_id || ''))) throw new ServiceError('A valid request_id is required.');
    const action = String(input.action || '').toLowerCase();
    if (!['accept', 'reject'].includes(action)) throw new ServiceError('action must be accept or reject.');
    const row = await JobRequest.findOne({ where: { id: input.request_id, ownerId }, include: [{ model: Booking, as: 'booking' }] });
    if (!row) throw new ServiceError('Request not found.', 404);
    if (row.status !== STATUS.PENDING) throw new ServiceError('This request has already been answered.', 409);
    const b = row.booking;

    if (action === 'reject') {
      const reason = input.reason ? String(input.reason).trim().slice(0, 300) : null;
      await row.update({ status: STATUS.REJECTED, rejectReason: reason, respondedAt: new Date() });
      await notificationService.notify(row.operatorId, {
        type: 'job_request_rejected',
        title: 'Job Request Not Accepted',
        body: `${b.bookingCode}: the owner chose not to give you this job.${reason ? ` ${reason}` : ''}`,
        data: { booking_id: b.id, booking_code: b.bookingCode, request_id: row.id }
      });
      return requestView(row);
    }

    if (b.operatorId) throw new ServiceError('This job already has an operator.', 409);
    // the operator asked for this job, so it counts as accepted on their side straight away
    await jobService.ownerAssignOperator(ownerId, b.id, row.operatorId, { silent: true });
    await Booking.update({ operatorStatus: 1, operatorRespondedAt: new Date() }, { where: { id: b.id } });
    await row.update({ status: STATUS.ACCEPTED, respondedAt: new Date() });
    const others = await JobRequest.findAll({ where: { bookingId: b.id, status: STATUS.PENDING, id: { [Op.ne]: row.id } } });
    await JobRequest.update({ status: STATUS.CLOSED, respondedAt: new Date() }, { where: { id: others.map((o) => o.id) } });

    await notificationService.notify(row.operatorId, {
      type: NOTIFICATION_TYPES.JOB_ASSIGNED,
      title: 'Job Request Accepted',
      body: `${b.bookingCode}: the owner gave you this job. Check the time and site in My Jobs.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    for (const o of others) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(o.operatorId, {
        type: 'job_request_closed',
        title: 'Job Taken',
        body: `${b.bookingCode} was given to another operator.`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      });
    }
    return requestView(row);
  }

  async pendingCount(ownerId) {
    return JobRequest.count({ where: { ownerId, status: STATUS.PENDING } });
  }
}

module.exports = { jobRequestService: new JobRequestService(), JOB_REQUEST_STATUS: STATUS };
