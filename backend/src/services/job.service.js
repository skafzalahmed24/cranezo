const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  Booking, Crane, CraneDocument, CranePhoto, JobPhoto, JobIssue, JobRequest, StaticDropdown, User
} = require('../models');
const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');
const { BOOKING_STATUS, BOOKING_STATUS_LABELS, NOTIFICATION_TYPES, BOOKING_CONFIG } = require('../constants/booking');
const {
  JOB_CONFIG, CHECKLIST_ITEMS, CHECKLIST_KEYS, STAGE_LABELS, jobStage, nextAction, timers, progressSteps,
  waitingSecondsNow, workingSecondsNow
} = require('../constants/job');
const { CRANE_APPROVAL_STATUS } = require('../constants/roles');
const { parseRange } = require('../utils/range');
const { notificationService } = require('./notification.service');
const { ServiceError } = require('./crane.service');
const { bookingHelpers: H } = require('./booking.service');
const { extensionService } = require('./extension.service');
const { supportService } = require('./support.service');
const billing = require('./billing');

const dd = ['id', 'dropdownName'];
const jobInclude = [...H.bookingInclude, { model: JobPhoto, as: 'jobPhotos', required: false }];

const todayIso = () => new Date().toISOString().slice(0, 10);
const istDayRange = (now = new Date()) => {
  const offset = JOB_CONFIG.IST_OFFSET_MINUTES * 60000;
  const local = new Date(now.getTime() + offset);
  local.setUTCHours(0, 0, 0, 0);
  const start = new Date(local.getTime() - offset);
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
};

const customerName = (b) => (b.customer ? b.customer.companyName || b.customer.fullName : null);
const settlementLabel = (s) => (s === 'settled' ? 'Paid by owner' : 'Pending from owner');

/** What the operator earns on a job: the commission the owner set (null until it is set) */
const operatorEarnings = (b) => {
  const c = billing.billOf(b).operator_commission;
  return {
    set: c.set,
    type: c.type,
    type_label: c.type_label,
    value: c.value,
    distance_km: c.distance_km || null,
    amount: c.set ? c.amount : null,
    label: c.set ? null : 'Commission not set by owner yet',
    settlement_status: b.operatorSettlementStatus,
    settlement_label: settlementLabel(b.operatorSettlementStatus),
    settled_at: H.iso(b.operatorSettledAt)
  };
};
const commissionAmount = (b) => {
  const c = billing.billOf(b).operator_commission;
  return c.set ? c.amount : null;
};
const statusTab = (b) => (b.status === BOOKING_STATUS.CONFIRMED ? 'Assigned'
  : [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS].includes(b.status) ? 'In Progress'
    : b.status === BOOKING_STATUS.COMPLETED ? 'Completed' : BOOKING_STATUS_LABELS[b.status]);

const photoView = (p) => ({
  id: p.id,
  photo_url: p.photoUrl,
  latitude: H.num(p.latitude),
  longitude: H.num(p.longitude),
  captured_at: H.iso(p.capturedAt)
});

const assertCoords = (input, required = false) => {
  const has = input.latitude !== undefined && input.latitude !== null && input.latitude !== '';
  const hasLng = input.longitude !== undefined && input.longitude !== null && input.longitude !== '';
  if (!has && !hasLng && !required) return { latitude: null, longitude: null };
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!has || !hasLng || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ServiceError('A valid latitude and longitude are required.');
  }
  return { latitude, longitude };
};

const cleanPhotos = (photos, { required = false } = {}) => {
  if (photos === undefined || photos === null) {
    if (required) throw new ServiceError('At least one photo is required.');
    return [];
  }
  if (!Array.isArray(photos)) throw new ServiceError('photos must be a list.');
  if (required && photos.length === 0) throw new ServiceError('At least one photo is required.');
  if (photos.length > JOB_CONFIG.MAX_PHOTOS) throw new ServiceError(`You can add up to ${JOB_CONFIG.MAX_PHOTOS} photos.`);
  return photos.map((p) => {
    const item = typeof p === 'string' ? { photo_url: p } : (p || {});
    if (!item.photo_url || typeof item.photo_url !== 'string') throw new ServiceError('Every photo needs a photo_url (from the upload API).');
    const coords = assertCoords(item);
    let capturedAt = null;
    if (item.captured_at) {
      capturedAt = new Date(item.captured_at);
      if (Number.isNaN(capturedAt.getTime())) throw new ServiceError('captured_at must be a valid date time.');
    }
    return { photoUrl: item.photo_url, latitude: coords.latitude, longitude: coords.longitude, capturedAt };
  });
};

class JobService {
  // ---------------------------------------------------------------- loading and views

  loadJob(id, where = {}) {
    return Booking.findOne({
      where: { id, ...where },
      include: jobInclude,
      order: [[{ model: JobPhoto, as: 'jobPhotos' }, 'id', 'ASC']]
    });
  }

  async mine(operatorId, bookingId) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const booking = await this.loadJob(bookingId, { operatorId });
    if (!booking) throw new ServiceError('Job not found.', 404);
    return booking;
  }

  /** The 6 ticks on the Start Job screen */
  async startChecks(b, operator) {
    const today = todayIso();
    const license = operator ? operator.operatorLicenseFront : null;
    const licenseValid = !!license && operator.operatorLicenseStatus !== 2
      && !(operator.licenseExpiryDate && operator.licenseExpiryDate < today);
    const expiredCraneDocs = await CraneDocument.count({ where: { craneId: b.craneId, expiryDate: { [Op.lt]: today } } });
    const sitePhotos = (b.jobPhotos || []).filter((p) => p.kind === 'site').length;
    const craneTitle = H.craneTitle(b.crane);

    const crane = b.crane.approvalStatus === CRANE_APPROVAL_STATUS.VERIFIED;
    const operatorOk = !!operator && operator.isActive === 0 && operator.isDeleted === 0 && licenseValid;
    const docsOk = licenseValid && expiredCraneDocs === 0;

    return [
      { key: 'crane_verified', label: 'Crane Verified', description: crane ? `${craneTitle} is verified` : 'This crane is not verified', ok: crane },
      { key: 'operator_verified', label: 'Operator Verified', description: operatorOk ? 'You are eligible for this job' : 'Your operator license is missing, expired or rejected', ok: operatorOk },
      { key: 'documents_valid', label: 'Documents Valid', description: docsOk ? 'All documents are up to date' : 'Some documents have expired', ok: docsOk },
      { key: 'arrival_completed', label: 'Arrival Completed', description: b.arrivalConfirmedAt ? `Arrived at site at ${H.iso(b.arrivedAt)}` : 'Waiting for the customer to confirm your arrival', ok: !!b.arrivalConfirmedAt },
      { key: 'site_verified', label: 'Site Verified', description: sitePhotos ? 'Site photos captured' : 'Take photos of the site', ok: sitePhotos > 0 }
    ];
  }

  checklistView(b) {
    const state = b.checklist || {};
    const items = CHECKLIST_ITEMS.map((i) => ({ ...i, done: state[i.key] === true }));
    const done = items.filter((i) => i.done).length;
    return { items, completed_count: done, total: items.length, completed: !!b.checklistCompletedAt };
  }

  summaryView(b) {
    const start = b.workStartedAt ? new Date(b.workStartedAt) : null;
    const end = b.workEndedAt ? new Date(b.workEndedAt) : null;
    const base = H.num(b.totalAmount);
    return {
      start_time: H.iso(start),
      end_time: H.iso(end),
      total_seconds: start && end ? Math.round((end - start) / 1000) : null,
      working_seconds: workingSecondsNow(b),
      waiting_seconds: waitingSecondsNow(b),
      extra_seconds: b.extraMinutes * 60,
      base_hours: b.durationHours,
      base_amount: base,
      waiting_charge: 0,
      extra_amount: Number(b.extraAmount),
      final_amount: b.finalAmount !== null && b.finalAmount !== undefined ? Number(b.finalAmount) : billing.billOf(b).total
    };
  }

  /** Full job: everything the operator job screens need, whatever the stage */
  async view(b) {
    const rules = await billing.bookingRules();
    const operator = b.operatorId
      ? await User.findByPk(b.operatorId, {
        attributes: ['id', 'isActive', 'isDeleted', 'operatorLicenseFront', 'operatorLicenseStatus', 'licenseExpiryDate']
      })
      : null;
    const crane = b.crane;
    const photos = b.jobPhotos || [];
    const site = photos.filter((p) => p.kind === 'site');
    const final = photos.filter((p) => p.kind === 'final');
    const stage = jobStage(b);
    const accepted = b.operatorStatus === 1;

    const liveLat = crane.currentLatitude !== null ? Number(crane.currentLatitude) : H.num(crane.latitude);
    const liveLng = crane.currentLongitude !== null ? Number(crane.currentLongitude) : H.num(crane.longitude);
    const distance = liveLat !== null && liveLng !== null
      ? H.round1(H.haversineKm(liveLat, liveLng, Number(b.latitude), Number(b.longitude)))
      : H.num(b.distanceKm);

    const checks = await this.startChecks(b, operator);
    const extension = await extensionService.blockFor(b);
    const typeName = b.craneTypeInfo ? b.craneTypeInfo.dropdownName : null;
    const capName = b.capacityInfo ? b.capacityInfo.dropdownName : null;

    return {
      booking_id: b.id,
      booking_code: b.bookingCode,
      status: b.status,
      status_label: BOOKING_STATUS_LABELS[b.status],
      tab_label: statusTab(b),
      stage,
      stage_label: STAGE_LABELS[stage],
      next_action: nextAction(b, site.length),
      operator_status: b.operatorStatus,
      requested_crane: {
        title: [capName, typeName].filter(Boolean).join(' '),
        crane_type_name: typeName,
        capacity_name: capName,
        primary_photo: H.primaryPhoto(crane)
      },
      assigned_crane: {
        id: crane.id,
        crane_code: crane.craneCode,
        title: H.craneTitle(crane),
        model_name: crane.modelName,
        registration_number: crane.registrationNumber,
        crane_type_name: typeName,
        capacity_name: capName,
        fuel_type_name: crane.fuelTypeInfo ? crane.fuelTypeInfo.dropdownName : null,
        primary_photo: H.primaryPhoto(crane)
      },
      customer: b.customer ? {
        id: b.customer.id,
        name: customerName(b),
        full_name: b.customer.fullName,
        member_id: b.customer.memberId,
        // contact is shown once the operator has accepted the job
        mobile_number: accepted ? b.customer.mobileNumber : null,
        country_code: accepted ? b.customer.countryCode : null
      } : null,
      // booking for someone else: call this person at the site
      site_contact: accepted && b.contactName ? { name: b.contactName, phone: b.contactPhone } : null,
      job_site: {
        name: b.siteName,
        address: b.siteAddress,
        latitude: H.num(b.latitude),
        longitude: H.num(b.longitude),
        distance_km: distance,
        eta_minutes: distance !== null ? H.etaMinutes(distance) : null
      },
      // true: the operator must reach the site (within radius_km) before marking arrival
      arrival_rule: { required: billing.arrivalCheckRequired(), radius_km: Number(rules.arrival_radius_km) || 1 },
      schedule: { start_type: b.startType, start_at: H.iso(b.startAt), end_at: H.iso(b.endAt) },
      duration: { type: b.durationType, service_type: H.SERVICE_TYPE[b.durationType], hours: b.durationHours, days: b.durationDays, label: H.durationLabel(b) },
      // the operator's own earning (commission), never the customer's bill
      estimated_earnings: commissionAmount(b),
      earnings: operatorEarnings(b),
      special_requirements: b.specialRequirements,
      extension,
      payment: H.paymentView(b),
      progress: progressSteps(b),
      timers: timers(b),
      arrival: {
        arrived_at: H.iso(b.arrivedAt),
        confirmed_at: H.iso(b.arrivalConfirmedAt),
        confirmed_by: b.arrivalConfirmedBy,
        waiting_for_customer: !!b.arrivedAt && !b.arrivalConfirmedAt
      },
      site_photos: site.map(photoView),
      checklist: this.checklistView(b),
      start_checks: checks,
      can_start: stage === 'arrived' && checks.every((c) => c.ok),
      final_photos: final.map(photoView),
      job_notes: b.jobNotes,
      summary: b.workEndedAt ? this.summaryView(b) : null,
      completion: {
        requested_at: H.iso(b.completionRequestedAt),
        otp_expires_at: H.iso(b.completionOtpExpiresAt),
        attempts_left: Math.max(0, JOB_CONFIG.OTP_MAX_ATTEMPTS - b.completionOtpAttempts),
        completed_at: H.iso(b.completedAt)
      },
      settlement: {
        final_amount: commissionAmount(b),
        status: b.operatorSettlementStatus,
        status_label: settlementLabel(b.operatorSettlementStatus)
      },
      can_cancel: false,
      created_at: H.iso(b.createdAt)
    };
  }

  listItem(b) {
    const crane = b.crane;
    return {
      booking_id: b.id,
      booking_code: b.bookingCode,
      status: b.status,
      tab_label: statusTab(b),
      stage: jobStage(b),
      stage_label: STAGE_LABELS[jobStage(b)],
      customer_name: customerName(b),
      location: b.siteName || b.siteAddress,
      start_at: H.iso(b.startAt),
      crane_label: `${H.craneTitle(crane)} (${crane.registrationNumber})`,
      crane_code: crane.craneCode,
      duration_label: H.durationLabel(b),
      estimated_earnings: commissionAmount(b),
      earnings_label: commissionAmount(b) === null ? 'Commission not set yet' : null,
      operator_status: b.operatorStatus
    };
  }

  // ---------------------------------------------------------------- home, online, jobs, earnings

  documentStatus(u) {
    const docs = [
      { key: 'operator_license', uploaded: !!u.operatorLicenseFront, status: u.operatorLicenseStatus },
      { key: 'voter_id', uploaded: !!u.voterIdFile, status: u.voterIdStatus },
      { key: 'aadhar_card', uploaded: !!u.aadharCardFile, status: u.aadharStatus },
      { key: 'pan_card', uploaded: !!u.panCardFile, status: u.panStatus },
      { key: 'other_documents', uploaded: !!u.otherDocumentFile, status: u.otherDocumentStatus }
    ];
    const uploaded = docs.filter((d) => d.uploaded);
    const rejected = uploaded.filter((d) => d.status === 2).length;
    const pending = uploaded.filter((d) => d.status === 0).length;
    const verified = uploaded.filter((d) => d.status === 1).length;
    const allVerified = uploaded.length > 0 && verified === uploaded.length;
    let label = 'All documents verified';
    if (!uploaded.length) label = 'Upload your documents';
    else if (rejected) label = 'Some documents were rejected';
    else if (pending) label = 'Documents pending verification';
    return { all_verified: allVerified, uploaded: uploaded.length, verified, pending, rejected, label };
  }

  async home(operatorId) {
    const user = await User.findByPk(operatorId, {
      attributes: ['id', 'fullName', 'isOnline', 'operatorLicenseFront', 'operatorLicenseStatus', 'voterIdFile', 'voterIdStatus', 'aadharCardFile', 'aadharStatus',
        'panCardFile', 'panStatus', 'otherDocumentFile', 'otherDocumentStatus', 'profileImage']
    });
    if (!user) throw new ServiceError('User not found.', 404);

    const crane = await Crane.findOne({
      where: { operatorId },
      include: [
        { model: StaticDropdown, as: 'craneTypeInfo', attributes: dd },
        { model: StaticDropdown, as: 'capacityInfo', attributes: dd },
        { model: CranePhoto, as: 'photos', attributes: ['id', 'photoUrl', 'sortOrder'] },
        { model: User, as: 'owner', attributes: ['id', 'fullName', 'companyName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const { start, end } = istDayRange();
    const base = { operatorId, status: { [Op.in]: [1, 5, 6, 7] } };
    const todayJobs = await Booking.findAll({
      where: { ...base, startAt: { [Op.gte]: start, [Op.lt]: end } },
      include: H.bookingInclude,
      order: [['startAt', 'ASC']],
      limit: 5
    });
    const todayCount = await Booking.count({ where: { ...base, startAt: { [Op.gte]: start, [Op.lt]: end } } });
    const todayEarnings = (await Booking.sum('operatorCommissionAmount', {
      where: { operatorId, status: BOOKING_STATUS.COMPLETED, completedAt: { [Op.gte]: start, [Op.lt]: end } }
    })) || 0;
    const active = await Booking.findOne({
      where: { operatorId, status: { [Op.in]: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] } },
      attributes: ['id', 'bookingCode', 'status']
    });
    const pendingAccept = await Booking.count({ where: { operatorId, status: BOOKING_STATUS.CONFIRMED, operatorStatus: 0 } });

    return {
      greeting_name: user.fullName,
      profile_image: user.profileImage,
      online: user.isOnline,
      // documents approved by the admin: until then the app shows a banner and job actions are blocked
      verified: require('../middlewares/verifiedOperator.middleware').isVerifiedOperator(user),
      online_label: user.isOnline ? 'Online' : 'Offline',
      online_message: user.isOnline ? 'You are online and ready for jobs' : 'You are currently offline',
      assigned_crane: crane ? {
        id: crane.id,
        crane_code: crane.craneCode,
        title: H.craneTitle(crane),
        model_name: crane.modelName,
        registration_number: crane.registrationNumber,
        crane_type_name: crane.craneTypeInfo ? crane.craneTypeInfo.dropdownName : null,
        capacity_name: crane.capacityInfo ? crane.capacityInfo.dropdownName : null,
        primary_photo: H.primaryPhoto(crane),
        availability_label: crane.availabilityStatus === 0 ? 'Available' : 'Not Available',
        owner_name: crane.owner ? crane.owner.companyName || crane.owner.fullName : null
      } : null,
      today_jobs: { count: todayCount, items: todayJobs.map((b) => this.listItem(b)) },
      today_earnings: Number(todayEarnings),
      document_status: this.documentStatus(user),
      active_job: active ? { booking_id: active.id, booking_code: active.bookingCode, status: active.status } : null,
      jobs_waiting_for_response: pendingAccept,
      unread_notifications: await notificationService.unreadCount(operatorId)
    };
  }

  async setOnline(operatorId, input) {
    if (typeof input.online !== 'boolean') throw new ServiceError('online must be true or false.');
    const coords = assertCoords(input);
    await User.update({ isOnline: input.online, onlineUpdatedAt: new Date() }, { where: { id: operatorId } });
    if (input.online && coords.latitude !== null) {
      await Crane.update(
        { currentLatitude: coords.latitude, currentLongitude: coords.longitude, locationUpdatedAt: new Date() },
        { where: { operatorId } }
      );
    }
    return { online: input.online, online_label: input.online ? 'Online' : 'Offline' };
  }

  async list(operatorId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const tab = String(input.tab || 'all').toLowerCase();
    const tabs = {
      all: { statuses: [1, 5, 6, 7], order: [['startAt', 'DESC']] },
      assigned: { statuses: [BOOKING_STATUS.CONFIRMED], order: [['startAt', 'ASC']] },
      in_progress: { statuses: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS], order: [['startAt', 'ASC']] },
      completed: { statuses: [BOOKING_STATUS.COMPLETED], order: [['startAt', 'DESC']] }
    };
    if (!tabs[tab]) throw new ServiceError('tab must be all, assigned, in_progress or completed.');

    const { rows, count } = await Booking.findAndCountAll({
      where: { operatorId, status: { [Op.in]: tabs[tab].statuses } },
      include: H.bookingInclude,
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      order: [...tabs[tab].order, ['id', 'ASC']]
    });
    return { range, items: rows.map((b) => this.listItem(b)), total: count };
  }

  async get(operatorId, bookingId) {
    return this.view(await this.mine(operatorId, bookingId));
  }

  async earningsSummary(operatorId) {
    const { start, end } = istDayRange();
    const completed = { operatorId, status: BOOKING_STATUS.COMPLETED };
    return {
      today_jobs: await Booking.count({ where: { operatorId, status: { [Op.in]: [1, 5, 6, 7] }, startAt: { [Op.gte]: start, [Op.lt]: end } } }),
      today_earnings: Number((await Booking.sum('operatorCommissionAmount', { where: { ...completed, completedAt: { [Op.gte]: start, [Op.lt]: end } } })) || 0),
      // commission the owner still has to pay / has paid
      pending_settlement: Number((await Booking.sum('operatorCommissionAmount', { where: { ...completed, operatorSettlementStatus: 'pending' } })) || 0),
      completed_settlement: Number((await Booking.sum('operatorCommissionAmount', { where: { ...completed, operatorSettlementStatus: 'settled' } })) || 0),
      total_earned: Number((await Booking.sum('operatorCommissionAmount', { where: completed })) || 0),
      completed_jobs: await Booking.count({ where: completed }),
      jobs_without_commission: await Booking.count({ where: { ...completed, operatorCommissionAmount: null } })
    };
  }

  async earningsList(operatorId, input = {}) {
    const range = parseRange(input);
    if (range.error) throw new ServiceError(range.error);
    const { rows, count } = await Booking.findAndCountAll({
      where: { operatorId, status: BOOKING_STATUS.COMPLETED },
      include: H.bookingInclude,
      distinct: true,
      limit: range.limit,
      offset: range.offset,
      order: [['completedAt', 'DESC'], ['id', 'ASC']]
    });
    const items = rows.map((b) => ({
      booking_id: b.id,
      booking_code: b.bookingCode,
      customer_name: customerName(b),
      location: b.siteName || b.siteAddress,
      completed_at: H.iso(b.completedAt),
      start_at: H.iso(b.startAt),
      crane_label: H.craneTitle(b.crane),
      amount: commissionAmount(b),
      earnings: operatorEarnings(b),
      settlement_status: b.operatorSettlementStatus,
      settlement_label: settlementLabel(b.operatorSettlementStatus)
    }));
    return { range, items, total: count };
  }

  // ---------------------------------------------------------------- job steps

  /** New Job Request: Accept */
  async accept(operatorId, bookingId) {
    const b = await this.mine(operatorId, bookingId);
    if (b.status !== BOOKING_STATUS.CONFIRMED || b.operatorStatus !== 0) {
      throw new ServiceError('This job has already been answered.', 409);
    }
    await b.update({ operatorStatus: 1, operatorRespondedAt: new Date() });
    await notificationService.notify(b.ownerId, {
      type: NOTIFICATION_TYPES.JOB_ACCEPTED,
      title: 'Operator Accepted the Job',
      body: `${b.bookingCode}: your operator accepted the job.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    return this.view(await this.mine(operatorId, bookingId));
  }

  /** New Job Request: Decline. The job goes back to the owner, who assigns another operator. */
  async decline(operatorId, bookingId, reason) {
    const b = await this.mine(operatorId, bookingId);
    if (b.status !== BOOKING_STATUS.CONFIRMED || b.operatorStatus !== 0) {
      throw new ServiceError('This job has already been answered.', 409);
    }
    await b.update({
      operatorId: null,
      operatorStatus: 0,
      operatorRespondedAt: new Date(),
      operatorDeclineReason: reason ? String(reason).trim().slice(0, 500) : null
    });
    await notificationService.notify(b.ownerId, {
      type: NOTIFICATION_TYPES.OPERATOR_DECLINED,
      title: 'Operator Declined the Job',
      body: `${b.bookingCode}: your operator declined. Please assign another operator.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    return { booking_id: b.id, declined: true };
  }

  /** Navigate to Job Site: Start Journey */
  async startJourney(operatorId, bookingId) {
    const b = await this.mine(operatorId, bookingId);
    if (b.status !== BOOKING_STATUS.CONFIRMED) throw new ServiceError('This job cannot be started now.', 409);
    if (b.operatorStatus !== 1) throw new ServiceError('Accept the job first.', 409);
    const earliest = H.addMs(new Date(b.startAt), -JOB_CONFIG.START_JOURNEY_LEAD_HOURS * 3600 * 1000);
    if (new Date() < earliest) {
      throw new ServiceError(`You can start the journey ${JOB_CONFIG.START_JOURNEY_LEAD_HOURS} hours before the job time.`, 409);
    }
    await b.update({ status: BOOKING_STATUS.EN_ROUTE, enRouteAt: new Date() });
    await notificationService.notify(b.customerId, {
      type: NOTIFICATION_TYPES.OPERATOR_EN_ROUTE,
      title: 'Operator is On the Way',
      body: `${b.bookingCode}: your operator has started the journey. Track the crane in the app.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    }, { preferenceKey: 'job_updates' });
    return this.view(await this.mine(operatorId, bookingId));
  }

  /** Live position while driving. Updates the crane the customer tracks. */
  async updateLocation(operatorId, input) {
    const { latitude, longitude } = assertCoords(input, true);
    await Crane.update(
      { currentLatitude: latitude, currentLongitude: longitude, locationUpdatedAt: new Date() },
      { where: { operatorId } }
    );
    const out = { updated: true };
    if (input.booking_id) {
      const b = await this.mine(operatorId, input.booking_id);
      const km = H.round1(H.haversineKm(latitude, longitude, Number(b.latitude), Number(b.longitude)));
      out.distance_km = km;
      out.eta_minutes = H.etaMinutes(km);
      // "Crane Arriving Soon", once per job, when about 15 minutes away
      if (b.status === BOOKING_STATUS.EN_ROUTE && !b.arrivedAt && !b.arrivingNotifiedAt && out.eta_minutes <= 15) {
        await b.update({ arrivingNotifiedAt: new Date() });
        await notificationService.notify(b.customerId, {
          type: 'crane_arriving_soon',
          title: 'Crane Arriving Soon',
          body: `Your crane is expected to arrive in ${out.eta_minutes} minutes.`,
          data: { booking_id: b.id, booking_code: b.bookingCode }
        }, { preferenceKey: 'job_updates' });
      }
    }
    return out;
  }

  /** You've Reached the Job Site */
  /**
   * The operator reached the site. Only counts at the site: the phone's location (sent with the call, or the
   * live location shared in the last 15 minutes) must be within the arrival radius, so the customer is told
   * 'arrived' only when the crane is really there.
   */
  async arrived(operatorId, bookingId, input = {}) {
    const b = await this.mine(operatorId, bookingId);
    if (b.status !== BOOKING_STATUS.EN_ROUTE || !b.enRouteAt) throw new ServiceError('Start the journey first.', 409);
    if (b.arrivedAt) throw new ServiceError('You have already marked your arrival.', 409);

    const rules = await billing.bookingRules();
    if (!billing.arrivalCheckRequired()) {
      // ARRIVAL_CHECK_REQUIRED=false: no location check, the operator can mark arrival at any time
      await b.update({ arrivedAt: new Date() });
      await notificationService.notify(b.customerId, {
        type: NOTIFICATION_TYPES.OPERATOR_ARRIVED,
        title: 'Operator Has Arrived',
        body: `${b.bookingCode}: your operator reached the site. Please confirm the arrival.`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      }, { preferenceKey: 'job_updates' });
      return this.view(await this.mine(operatorId, bookingId));
    }
    let lat = input.latitude !== undefined && input.latitude !== null ? Number(input.latitude) : null;
    let lng = input.longitude !== undefined && input.longitude !== null ? Number(input.longitude) : null;
    const crane = await Crane.findByPk(b.craneId, { attributes: ['id', 'currentLatitude', 'currentLongitude', 'locationUpdatedAt'] });
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== null && lng !== null) {
      if (crane) await crane.update({ currentLatitude: lat, currentLongitude: lng, locationUpdatedAt: new Date() });
    } else if (crane && crane.currentLatitude !== null && crane.locationUpdatedAt && Date.now() - new Date(crane.locationUpdatedAt).getTime() < 15 * 60 * 1000) {
      lat = Number(crane.currentLatitude);
      lng = Number(crane.currentLongitude);
    } else {
      throw new ServiceError('Turn on location so we can see you have reached the site.', 409);
    }
    const siteKm = H.haversineKm(lat, lng, Number(b.latitude), Number(b.longitude));
    const radius = Number(rules.arrival_radius_km) || 1;
    if (siteKm > radius) {
      throw new ServiceError(`You are about ${H.round1(siteKm)} km from the site. Mark arrival when you reach the site.`, 409);
    }
    await b.update({ arrivedAt: new Date() });
    await notificationService.notify(b.customerId, {
      type: NOTIFICATION_TYPES.OPERATOR_ARRIVED,
      title: 'Operator Has Arrived',
      body: `${b.bookingCode}: your operator reached the site. Please confirm the arrival.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    }, { preferenceKey: 'job_updates' });
    return this.view(await this.mine(operatorId, bookingId));
  }

  /** "Confirm Arrival Manually" when the customer has not confirmed */
  async confirmArrivalManually(operatorId, bookingId) {
    const b = await this.mine(operatorId, bookingId);
    if (!b.arrivedAt) throw new ServiceError('Mark your arrival first.', 409);
    if (b.arrivalConfirmedAt) throw new ServiceError('Arrival is already confirmed.', 409);
    await b.update({ arrivalConfirmedAt: new Date(), arrivalConfirmedBy: 'operator' });
    return this.view(await this.mine(operatorId, bookingId));
  }

  /** Customer app: confirm the operator is at the site */
  async customerConfirmArrival(customerId, bookingId) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findOne({ where: { id: bookingId, customerId } });
    if (!b) throw new ServiceError('Booking not found.', 404);
    if (!b.arrivedAt) throw new ServiceError('The operator has not reached the site yet.', 409);
    if (b.arrivalConfirmedAt) throw new ServiceError('Arrival is already confirmed.', 409);
    await b.update({ arrivalConfirmedAt: new Date(), arrivalConfirmedBy: 'customer' });
    if (b.operatorId) {
      await notificationService.notify(b.operatorId, {
        type: 'arrival_confirmed',
        title: 'Arrival Confirmed',
        body: `${b.bookingCode}: the customer confirmed your arrival. You can start the job.`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      });
    }
    return { booking_id: b.id, arrival_confirmed: true };
  }

  /** Site Photo: replaces the current set (Retake = send the new list) */
  async saveSitePhotos(operatorId, bookingId, photos) {
    const b = await this.mine(operatorId, bookingId);
    if (jobStage(b) !== 'arrived') throw new ServiceError('You can add site photos after you reach the site and before the job starts.', 409);
    const clean = cleanPhotos(photos, { required: true });
    await JobPhoto.destroy({ where: { bookingId: b.id, kind: 'site' } });
    await JobPhoto.bulkCreate(clean.map((p) => ({ ...p, bookingId: b.id, uploadedBy: operatorId, kind: 'site' })));
    return this.view(await this.mine(operatorId, bookingId));
  }

  async checklist(operatorId, bookingId) {
    return this.checklistView(await this.mine(operatorId, bookingId));
  }

  async saveChecklist(operatorId, bookingId, items) {
    const b = await this.mine(operatorId, bookingId);
    if (jobStage(b) !== 'arrived') throw new ServiceError('The safety checklist is done at the site before the job starts.', 409);
    if (!items || typeof items !== 'object' || Array.isArray(items)) {
      throw new ServiceError('items must be an object like { "ground_checked": true }.');
    }
    const unknown = Object.keys(items).filter((k) => !CHECKLIST_KEYS.includes(k));
    if (unknown.length) throw new ServiceError(`Unknown checklist item: ${unknown.join(', ')}.`);
    if (Object.values(items).some((v) => typeof v !== 'boolean')) throw new ServiceError('Every checklist item must be true or false.');

    const state = { ...(b.checklist || {}), ...items };
    const complete = CHECKLIST_KEYS.every((k) => state[k] === true);
    await b.update({ checklist: state, checklistCompletedAt: complete ? (b.checklistCompletedAt || new Date()) : null });
    return this.checklistView(await this.mine(operatorId, bookingId));
  }

  /** Start Job: every tick on the Start Job screen must be green */
  async startJob(operatorId, bookingId) {
    const b = await this.mine(operatorId, bookingId);
    if (jobStage(b) !== 'arrived') throw new ServiceError('You can start the job once you are at the site.', 409);
    const operator = await User.findByPk(operatorId, {
      attributes: ['id', 'isActive', 'isDeleted', 'operatorLicenseFront', 'operatorLicenseStatus', 'licenseExpiryDate']
    });
    const failing = (await this.startChecks(b, operator)).find((c) => !c.ok);
    if (failing) throw new ServiceError(`${failing.label}: ${failing.description}.`, 409);

    await b.update({ status: BOOKING_STATUS.IN_PROGRESS, workStartedAt: new Date() });
    await notificationService.notify(b.customerId, {
      type: NOTIFICATION_TYPES.JOB_STARTED,
      title: 'Job Started',
      body: `${b.bookingCode}: your operator has started the job.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    }, { preferenceKey: 'job_updates' });
    return this.view(await this.mine(operatorId, bookingId));
  }

  /** Job Monitoring: "Add Waiting" start / stop */
  async waiting(operatorId, bookingId, action) {
    const b = await this.mine(operatorId, bookingId);
    if (jobStage(b) !== 'working') throw new ServiceError('Waiting time can be added while the job is in progress.', 409);
    const now = new Date();
    if (action === 'start') {
      if (b.waitingSince) throw new ServiceError('Waiting time is already running.', 409);
      await b.update({ waitingSince: now });
    } else if (action === 'stop') {
      if (!b.waitingSince) throw new ServiceError('Waiting time is not running.', 409);
      await b.update({ waitingSeconds: waitingSecondsNow(b, now), waitingSince: null });
    } else {
      throw new ServiceError('action must be "start" or "stop".');
    }
    return timers(await this.mine(operatorId, bookingId));
  }

  /** Break Down, Report Issue and the Emergency button */
  async report(operatorId, bookingId, kind, input) {
    const b = await this.mine(operatorId, bookingId);
    const allowed = kind === 'emergency'
      ? [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS]
      : [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS];
    if (!allowed.includes(b.status)) throw new ServiceError('This can only be reported for an active job.', 409);

    const coords = assertCoords(input);
    const photos = cleanPhotos(input.photos).map((p) => p.photoUrl);
    const description = input.description ? String(input.description).trim().slice(0, 1000) : null;
    let breakdownType = null;
    let typeName = null;

    if (kind === 'breakdown') {
      const id = Number(input.breakdown_type);
      const row = Number.isInteger(id)
        ? await StaticDropdown.findOne({ where: { id, dropdownType: DROPDOWN_TYPES.BREAKDOWN_TYPE, dropdownTypeStatus: 0 }, attributes: dd })
        : null;
      if (!row) throw new ServiceError('breakdown_type is required and must be a valid option.');
      breakdownType = row.id;
      typeName = row.dropdownName;
    }
    if (kind === 'issue' && !description) throw new ServiceError('Please describe the issue.');

    const issue = await JobIssue.create({
      bookingId: b.id,
      reportedBy: operatorId,
      kind,
      breakdownType,
      description,
      photos: photos.length ? photos : null,
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    const copy = {
      breakdown: { type: NOTIFICATION_TYPES.BREAKDOWN_REPORTED, title: 'Crane Breakdown Reported', body: `${b.bookingCode}: ${typeName}${description ? ` - ${description}` : ''}` },
      issue: { type: NOTIFICATION_TYPES.ISSUE_REPORTED, title: 'Issue Reported', body: `${b.bookingCode}: ${description}` },
      emergency: { type: NOTIFICATION_TYPES.EMERGENCY, title: 'EMERGENCY: Operator Needs Help', body: `${b.bookingCode}: the operator pressed Get Help Now.` }
    }[kind];
    await notificationService.notify(b.ownerId, { ...copy, data: { booking_id: b.id, booking_code: b.bookingCode, issue_id: issue.id, kind } });
    if (kind === 'emergency') {
      // the Cranezo support team sees it first in Admin > Support
      await supportService.createEmergencyTicket(operatorId, 2, {
        bookingId: b.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        description: `Operator emergency on job ${b.bookingCode}. ${description || ''}`.trim()
      });
    }

    return {
      issue_id: issue.id,
      kind,
      breakdown_type: breakdownType,
      breakdown_type_name: typeName,
      description,
      status: issue.status,
      message: kind === 'emergency'
        ? 'Help has been requested. The owner and the Cranezo team have been alerted.'
        : 'Reported. The owner and the Cranezo team have been notified.'
    };
  }

  /** Photos & Notes -> Continue: stops the clock and fixes the amount */
  async finish(operatorId, bookingId, input) {
    const b = await this.mine(operatorId, bookingId);
    if (jobStage(b) !== 'working') throw new ServiceError('Only a job in progress can be finished.', 409);
    const photos = cleanPhotos(input.final_photos);
    const now = new Date();
    const waiting = waitingSecondsNow(b, now);
    const working = Math.max(0, Math.floor((now - new Date(b.workStartedAt)) / 1000) - waiting);

    if (input.final_photos !== undefined) {
      await JobPhoto.destroy({ where: { bookingId: b.id, kind: 'final' } });
      if (photos.length) await JobPhoto.bulkCreate(photos.map((p) => ({ ...p, bookingId: b.id, uploadedBy: operatorId, kind: 'final' })));
    }
    await b.update({
      workEndedAt: now,
      waitingSince: null,
      waitingSeconds: waiting,
      workingSeconds: working,
      jobNotes: input.notes ? String(input.notes).trim().slice(0, 1000) : null,
      // booked amount + approved extra time + owner charges + GST. Waiting time is not charged.
      finalAmount: billing.billOf(b).total
    });
    await extensionService.closePending(b.id);
    return this.view(await this.mine(operatorId, bookingId));
  }

  /** Request Customer Confirmation: the customer gets a 6 digit code to read out */
  async requestConfirmation(operatorId, bookingId) {
    const b = await this.mine(operatorId, bookingId);
    if (!['summary', 'awaiting_confirmation'].includes(jobStage(b))) {
      throw new ServiceError('Finish the job before requesting customer confirmation.', 409);
    }
    const otp = String(crypto.randomInt(100000, 1000000));
    const expires = H.addMs(new Date(), JOB_CONFIG.OTP_VALID_MINUTES * 60000);
    await b.update({
      completionOtp: otp,
      completionOtpExpiresAt: expires,
      completionOtpAttempts: 0,
      completionRequestedAt: new Date()
    });
    await notificationService.notify(b.customerId, {
      type: NOTIFICATION_TYPES.COMPLETION_REQUESTED,
      title: 'Confirm Job Completion',
      body: `${b.bookingCode}: your job is finished. Share this code with the operator to confirm: ${otp}`,
      // the code goes in the data too: the app shows it in a popup without opening notifications
      data: { booking_id: b.id, booking_code: b.bookingCode, code: String(otp) }
    }, { preferenceKey: 'job_updates' });
    return { otp_sent: true, expires_at: H.iso(expires), message: 'We sent a 6 digit code to the customer. Ask them for it.' };
  }

  /** Customer Confirmation: Confirm Completion with the OTP */
  async confirmCompletion(operatorId, bookingId, otp) {
    const b = await this.mine(operatorId, bookingId);
    if (jobStage(b) !== 'awaiting_confirmation') throw new ServiceError('Request customer confirmation first.', 409);
    const code = String(otp || '').trim();
    if (!/^\d{6}$/.test(code)) throw new ServiceError('Enter the 6 digit code.');
    if (b.completionOtpAttempts >= JOB_CONFIG.OTP_MAX_ATTEMPTS) {
      throw new ServiceError('Too many wrong attempts. Request a new code.', 429);
    }
    if (!b.completionOtpExpiresAt || new Date() > new Date(b.completionOtpExpiresAt)) {
      throw new ServiceError('The code has expired. Request a new code.', 410);
    }
    if (code !== b.completionOtp) {
      const attempts = b.completionOtpAttempts + 1;
      await b.update({ completionOtpAttempts: attempts });
      const left = JOB_CONFIG.OTP_MAX_ATTEMPTS - attempts;
      throw new ServiceError(`Incorrect code. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`, 400);
    }

    // every amount is frozen now, so a later change of fee, charges or GST never rewrites this job
    await b.update({
      ...billing.freezeColumns(b, await billing.platformFeePercent()),
      deductionsAmount: 0,
      status: BOOKING_STATUS.COMPLETED,
      completedAt: new Date(),
      completionOtp: null,
      completionOtpExpiresAt: null,
      settlementStatus: 'pending'
    });
    const done = await this.mine(operatorId, bookingId);
    for (const userId of [b.customerId, b.ownerId]) {
      // eslint-disable-next-line no-await-in-loop
      await notificationService.notify(userId, {
        type: NOTIFICATION_TYPES.JOB_COMPLETED,
        title: 'Job Completed',
        body: `${b.bookingCode} was completed successfully.`,
        data: { booking_id: b.id, booking_code: b.bookingCode }
      });
    }
    // ask for feedback while the job is fresh
    await notificationService.notify(b.customerId, {
      type: 'rating_reminder',
      title: 'Rate Your Experience',
      body: 'How was your recent crane service? Share your feedback.',
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    return this.view(done);
  }

  /** Extra Time Request screen: approve or reject */
  async respondExtension(operatorId, bookingId, input) {
    await extensionService.respond(operatorId, bookingId, input);
    return this.view(await this.mine(operatorId, bookingId));
  }

  // ---------------------------------------------------------------- owner

  /**
   * Owner picks (or changes) the operator of a booking that has not started, for THIS job only.
   * Either one of the owner's operators (operator_id), or any operator by their ID code (operator_code, e.g. OP497309),
   * so an outside operator can do one job and then go back to other work.
   */
  async ownerAssignOperator(ownerId, bookingId, operatorId, { silent = false, operatorCode = null, commissionType = null, commissionValue = null } = {}) {
    if (!H.UUID_RE.test(String(bookingId || ''))) throw new ServiceError('A valid booking_id is required.');
    const b = await Booking.findOne({ where: { id: bookingId, ownerId } });
    if (!b) throw new ServiceError('Booking not found.', 404);
    if (![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.AWAITING_PAYMENT].includes(b.status) || b.enRouteAt) {
      throw new ServiceError('An operator can only be assigned before the journey starts.', 409);
    }

    let operator;
    if (operatorCode) {
      const code = String(operatorCode).trim().toUpperCase();
      operator = await User.findOne({ where: { memberId: code, roleId: 2, isDeleted: 0 }, attributes: ['id', 'isActive', 'fullName'] });
      if (!operator) throw new ServiceError(`No operator found with ID ${code}. Check the ID with the operator.`, 404);
      if (operator.isActive !== 0) throw new ServiceError('This operator account is blocked.', 409);
      operatorId = operator.id; // eslint-disable-line no-param-reassign
    } else {
      if (!H.UUID_RE.test(String(operatorId || ''))) throw new ServiceError('Choose an operator or enter an operator ID.');
      operator = await User.findOne({
        where: { id: operatorId, roleId: 2, isDeleted: 0, isActive: 0, ownerId: { [Op.or]: [ownerId, null] } },
        attributes: ['id', 'fullName']
      });
      if (!operator) throw new ServiceError('That operator is not available.', 400);
    }

    // only operators the admin has verified can be given a job
    const { operatorVerified } = require('../middlewares/verifiedOperator.middleware');
    if (!(await operatorVerified(operatorId))) {
      throw new ServiceError(`${operator.fullName || 'This operator'} is not verified yet. Cranezo checks the operator's documents first.`, 409);
    }

    // one operator, one job at a time
    const clash = await Booking.findOne({
      where: {
        id: { [Op.ne]: b.id },
        operatorId,
        status: { [Op.in]: [BOOKING_STATUS.AWAITING_PAYMENT, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] },
        startAt: { [Op.lt]: b.endAt },
        endAt: { [Op.gt]: b.startAt }
      },
      attributes: ['bookingCode']
    });
    if (clash) throw new ServiceError(`${operator.fullName || 'This operator'} is already booked at that time (${clash.bookingCode}).`, 409);

    const defaults = await billing.ownerSettings(ownerId);
    // what the operator earns, when the owner set it together with the choice of operator
    const hasType = commissionType !== null && commissionType !== undefined && commissionType !== '';
    if (hasType && (commissionValue === null || commissionValue === undefined || String(commissionValue).trim() === '')) {
      throw new ServiceError('Enter what the operator will earn for this job.');
    }
    const chosen = hasType ? billing.cleanCommission(commissionType, commissionValue) : null;
    if (chosen && chosen.type === 'per_km' && !(Number(b.distanceKm) > 0)) throw new ServiceError('This job has no distance, so per km cannot be used.');
    await b.update({
      operatorId,
      operatorStatus: 0,
      operatorRespondedAt: null,
      operatorDeclineReason: null,
      operatorCommissionType: chosen ? chosen.type : (b.operatorCommissionType || defaults.default_commission_type),
      operatorCommissionValue: chosen ? chosen.value : (b.operatorCommissionType ? b.operatorCommissionValue : defaults.default_commission_value)
    });
    if (silent) return null;

    // a direct assignment answers every operator who asked for this job
    const asked = await JobRequest.findAll({ where: { bookingId: b.id, status: 0 }, attributes: ['id', 'operatorId'] });
    if (asked.length) {
      await JobRequest.update(
        { status: 4, respondedAt: new Date() },
        { where: { id: asked.filter((r) => r.operatorId !== operatorId).map((r) => r.id) } }
      );
      await JobRequest.update({ status: 1, respondedAt: new Date() }, { where: { bookingId: b.id, status: 0, operatorId } });
    }
    const earns = billing.billOf(b.get({ plain: true })).operator_commission.amount;
    await notificationService.notify(operatorId, {
      type: NOTIFICATION_TYPES.JOB_ASSIGNED,
      title: 'New Job Request',
      body: earns > 0
        ? `${b.bookingCode}: you have a new job. You will earn ₹${earns}. Please accept or decline.`
        : `${b.bookingCode}: you have a new job. Please accept or decline.`,
      data: { booking_id: b.id, booking_code: b.bookingCode }
    });
    return H.ownerView(await H.loadBooking(b.id));
  }
}

module.exports = { jobService: new JobService() };
