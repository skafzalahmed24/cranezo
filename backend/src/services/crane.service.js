const { Op } = require('sequelize');
const {
  sequelize, Crane, CranePhoto, CraneDocument, StaticDropdown, User
} = require('../models');
const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');
const { generateUniqueMemberId } = require('../utils/memberIdGenerator');
const {
  CRANE_APPROVAL_STATUS,
  CRANE_APPROVAL_LABELS,
  CRANE_REVIEW_HOURS_MIN,
  CRANE_REVIEW_HOURS_MAX
} = require('../constants/roles');

const OPERATOR_ROLE_ID = 2;
const OPERATOR_ATTRS = ['id', 'memberId', 'fullName', 'mobileNumber', 'countryCode', 'userEmail', 'profileImage', 'ownerId', 'isMobileVerified'];

class ServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const dropdownAttrs = ['id', 'dropdownName'];

const craneIncludes = [
  { model: StaticDropdown, as: 'craneTypeInfo', attributes: dropdownAttrs },
  { model: StaticDropdown, as: 'capacityInfo', attributes: dropdownAttrs },
  { model: StaticDropdown, as: 'fuelTypeInfo', attributes: dropdownAttrs },
  { model: User, as: 'operator', attributes: ['id', 'memberId', 'fullName', 'mobileNumber', 'countryCode', 'profileImage'] },
  { model: User, as: 'owner', attributes: ['id', 'memberId', 'fullName', 'companyName', 'mobileNumber', 'countryCode'] },
  { model: CranePhoto, as: 'photos', attributes: ['id', 'photoUrl', 'sortOrder'] },
  {
    model: CraneDocument,
    as: 'documents',
    attributes: ['id', 'documentType', 'fileUrl', 'expiryDate'],
    include: [{ model: StaticDropdown, as: 'documentTypeInfo', attributes: dropdownAttrs }]
  }
];

const reviewMessage = (crane) => {
  switch (crane.approvalStatus) {
    case CRANE_APPROVAL_STATUS.VERIFIED:
      return 'Your crane has been verified and is now live for bookings.';
    case CRANE_APPROVAL_STATUS.REJECTED:
      return crane.rejectionReason
        ? `Your crane was rejected: ${crane.rejectionReason}`
        : 'Your crane was rejected. Please update the details and resubmit.';
    default:
      return `Your crane is under review. We have received your crane details and our team is verifying the information. Approval usually takes ${CRANE_REVIEW_HOURS_MIN} to ${CRANE_REVIEW_HOURS_MAX} hours. You will be notified once it is approved.`;
  }
};

const isoDate = (d) => (d ? new Date(d).toISOString() : null);

const formatCrane = (crane) => {
  const c = crane.toJSON ? crane.toJSON() : crane;
  const submitted = new Date(c.submittedAt);
  const underReview = c.approvalStatus === CRANE_APPROVAL_STATUS.UNDER_REVIEW;
  const photos = [...(c.photos || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: c.id,
    crane_code: c.craneCode,
    crane_type: c.craneType,
    crane_type_name: c.craneTypeInfo ? c.craneTypeInfo.dropdownName : null,
    capacity: c.capacity,
    capacity_name: c.capacityInfo ? c.capacityInfo.dropdownName : null,
    fuel_type: c.fuelType,
    fuel_type_name: c.fuelTypeInfo ? c.fuelTypeInfo.dropdownName : null,
    model_name: c.modelName,
    registration_number: c.registrationNumber,
    location: c.location,
    latitude: c.latitude !== null && c.latitude !== undefined ? Number(c.latitude) : null,
    longitude: c.longitude !== null && c.longitude !== undefined ? Number(c.longitude) : null,
    hourly_rate: Number(c.hourlyRate),
    minimum_hours: c.minimumHours,
    availability_status: c.availabilityStatus,
    availability_label: c.availabilityStatus === 0 ? 'Available' : 'Not Available',
    approval_status: c.approvalStatus,
    approval_label: CRANE_APPROVAL_LABELS[c.approvalStatus],
    rejection_reason: c.rejectionReason || null,
    status_message: reviewMessage(c),
    submitted_at: isoDate(c.submittedAt),
    expected_review_by: underReview
      ? isoDate(new Date(submitted.getTime() + CRANE_REVIEW_HOURS_MAX * 3600 * 1000))
      : null,
    reviewed_at: isoDate(c.reviewedAt),
    primary_photo: photos.length ? photos[0].photoUrl : null,
    photos: photos.map((p) => ({ id: p.id, photo_url: p.photoUrl })),
    documents: (c.documents || []).map((d) => ({
      id: d.id,
      document_type: d.documentType,
      document_type_name: d.documentTypeInfo ? d.documentTypeInfo.dropdownName : null,
      file_url: d.fileUrl,
      expiry_date: d.expiryDate || null
    })),
    operator: c.operator ? {
      id: c.operator.id,
      member_id: c.operator.memberId,
      full_name: c.operator.fullName,
      mobile_number: c.operator.mobileNumber,
      country_code: c.operator.countryCode,
      profile_image: c.operator.profileImage
    } : null,
    owner: c.owner ? {
      id: c.owner.id,
      member_id: c.owner.memberId,
      full_name: c.owner.fullName,
      company_name: c.owner.companyName,
      mobile_number: c.owner.mobileNumber,
      country_code: c.owner.countryCode
    } : null,
    created_at: isoDate(c.createdAt),
    updated_at: isoDate(c.updatedAt)
  };
};

const toInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
};

async function assertDropdown(id, type, label, { required = true } = {}) {
  if (id === null || id === undefined) {
    if (required) throw new ServiceError(`${label} is required.`);
    return;
  }
  if (Number.isNaN(id)) throw new ServiceError(`${label} must be a valid dropdown id.`);
  const row = await StaticDropdown.findOne({
    where: { id, dropdownType: type, dropdownTypeStatus: 0 },
    attributes: ['id']
  });
  if (!row) throw new ServiceError(`${label} is not a valid option.`);
}

async function assertOperator(operatorId, ownerId) {
  if (!operatorId) return;
  // An owner can assign their own operators or independently registered ones
  const operator = await User.findOne({
    where: {
      id: operatorId,
      roleId: OPERATOR_ROLE_ID,
      isDeleted: 0,
      isActive: 0,
      ownerId: { [Op.or]: [ownerId, null] }
    },
    attributes: ['id']
  });
  if (!operator) throw new ServiceError('Assigned operator is not a valid operator.');
}

async function normalizeDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new ServiceError('At least one document is required.');
  }
  const seen = new Set();
  const out = [];
  for (const doc of documents) {
    const documentType = toInt(doc && doc.document_type);
    await assertDropdown(documentType, DROPDOWN_TYPES.CRANE_DOCUMENT_TYPE, 'document_type');
    if (seen.has(documentType)) throw new ServiceError('Each document_type can only be added once.');
    seen.add(documentType);
    if (!doc.file_url || typeof doc.file_url !== 'string') {
      throw new ServiceError('file_url is required for every document.');
    }
    if (doc.expiry_date && Number.isNaN(Date.parse(doc.expiry_date))) {
      throw new ServiceError('expiry_date must be a valid date (YYYY-MM-DD).');
    }
    out.push({ documentType, fileUrl: doc.file_url, expiryDate: doc.expiry_date || null });
  }
  return out;
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos) || photos.length === 0) {
    throw new ServiceError('At least one photo is required.');
  }
  if (photos.some((p) => !p || typeof p !== 'string')) {
    throw new ServiceError('photos must be an array of file urls.');
  }
  return photos;
}

async function nextCraneCode(transaction) {
  const [rows] = await sequelize.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(crane_code FROM 4) AS INTEGER)), 0) AS max FROM cranes WHERE crane_code ~ '^CRN[0-9]+$'",
    { transaction }
  );
  return `CRN${String(Number(rows[0].max) + 1).padStart(3, '0')}`;
}

const loadCrane = (id, where = {}) =>
  Crane.findOne({ where: { id, ...where }, include: craneIncludes });

const RESET_TO_REVIEW = () => ({
  approvalStatus: CRANE_APPROVAL_STATUS.UNDER_REVIEW,
  rejectionReason: null,
  submittedAt: new Date(),
  reviewedAt: null,
  reviewedBy: null
});

class CraneService {
  /**
   * Dropdowns + operators the Add Crane form needs.
   * Pass `type` (6 crane type, 7 capacity, 8 fuel type, 9 document type) to get one list only.
   */
  async getFormOptions(ownerId, type = null) {
    const types = {
      [DROPDOWN_TYPES.CRANE_TYPE]: 'crane_types',
      [DROPDOWN_TYPES.CRANE_CAPACITY]: 'capacities',
      [DROPDOWN_TYPES.FUEL_TYPE]: 'fuel_types',
      [DROPDOWN_TYPES.CRANE_DOCUMENT_TYPE]: 'document_types'
    };
    const wanted = toInt(type);
    if (wanted !== null && !types[wanted]) {
      throw new ServiceError('type must be one of 6 (crane type), 7 (capacity), 8 (fuel type), 9 (document type).');
    }

    const rows = await StaticDropdown.findAll({
      where: {
        dropdownType: { [Op.in]: wanted !== null ? [wanted] : Object.keys(types).map(Number) },
        dropdownTypeStatus: 0
      },
      order: [['id', 'ASC']]
    });
    const pick = (t) => rows
      .filter((r) => r.dropdownType === t)
      .map((r) => ({ id: r.id, name: r.dropdownName, description: r.dropdownDescription }));

    if (wanted !== null) return pick(wanted);

    return {
      crane_types: pick(DROPDOWN_TYPES.CRANE_TYPE),
      capacities: pick(DROPDOWN_TYPES.CRANE_CAPACITY),
      fuel_types: pick(DROPDOWN_TYPES.FUEL_TYPE),
      document_types: pick(DROPDOWN_TYPES.CRANE_DOCUMENT_TYPE),
      operators: await this.listOperators(ownerId),
      availability_options: [
        { id: 0, name: 'Available' },
        { id: 1, name: 'Not Available' }
      ]
    };
  }

  /**
   * All operators an owner can use: ones they added (source owner_added)
   * plus independently registered ones (source registered).
   * Admins (ownerId null) see every operator.
   */
  operatorWhere(ownerId, search) {
    const where = { roleId: OPERATOR_ROLE_ID, isDeleted: 0, isActive: 0 };
    if (ownerId) where.ownerId = { [Op.or]: [ownerId, null] };
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.and] = [{
        [Op.or]: [
          { fullName: { [Op.iLike]: term } },
          { mobileNumber: { [Op.iLike]: term } },
          { memberId: { [Op.iLike]: term } }
        ]
      }];
    }

    return where;
  }

  formatOperator(o) {
    return {
      id: o.id,
      member_id: o.memberId,
      full_name: o.fullName,
      mobile_number: o.mobileNumber,
      country_code: o.countryCode,
      user_email: o.userEmail,
      profile_image: o.profileImage,
      owner_id: o.ownerId,
      source: o.ownerId ? 'owner_added' : 'registered',
      is_mobile_verified: o.isMobileVerified === 0
    };
  }

  /** Every operator the owner can use (Add Crane form dropdown, not paginated) */
  async listOperators(ownerId = null, { search } = {}) {
    const operators = await User.findAll({
      where: this.operatorWhere(ownerId, search),
      attributes: OPERATOR_ATTRS,
      order: [['fullName', 'ASC']]
    });
    return operators.map((o) => this.formatOperator(o));
  }

  /** Operators list API with min/max range */
  async listOperatorsRange(ownerId, { search, offset = 0, limit = 10 } = {}) {
    const { rows, count } = await User.findAndCountAll({
      where: this.operatorWhere(ownerId, search),
      attributes: OPERATOR_ATTRS,
      limit,
      offset,
      order: [['fullName', 'ASC'], ['id', 'ASC']]
    });
    return { items: rows.map((o) => this.formatOperator(o)), total: count };
  }

  /**
   * Owner adds an operator directly (stored in users, role 2, owner_id = owner).
   * The operator can later sign in with the normal OTP flow using this mobile number.
   */
  async createOperator(ownerId, body) {
    const fullName = String(body.full_name || '').trim();
    const mobile = String(body.mobile_number || body.phone_number || '').trim();
    const countryCode = String(body.country_code || '+91').trim();
    if (!fullName) throw new ServiceError('full_name is required.');
    if (!mobile) throw new ServiceError('mobile_number is required.');
    if (!/^\d{6,15}$/.test(mobile)) throw new ServiceError('mobile_number must be 6 to 15 digits.');
    if (body.user_email && !/\S+@\S+\.\S+/.test(body.user_email)) throw new ServiceError('user_email is invalid.');

    const existing = await User.findOne({ where: { mobileNumber: mobile, countryCode }, attributes: ['id'] });
    if (existing) throw new ServiceError('A user with this mobile number already exists.', 409);

    const operator = await User.create({
      countryCode,
      mobileNumber: mobile,
      fullName,
      userEmail: body.user_email || null,
      profileImage: body.profile_image || null,
      roleId: OPERATOR_ROLE_ID,
      memberId: await generateUniqueMemberId(OPERATOR_ROLE_ID, User),
      ownerId,
      isMobileVerified: 1,
      isActive: 0,
      isDeleted: 0
    });

    return (await this.listOperators(ownerId, { search: mobile })).find((o) => o.id === operator.id);
  }

  async createCrane(ownerId, body) {
    const craneType = toInt(body.crane_type);
    const capacity = toInt(body.capacity);
    const fuelType = toInt(body.fuel_type);
    await assertDropdown(craneType, DROPDOWN_TYPES.CRANE_TYPE, 'crane_type');
    await assertDropdown(capacity, DROPDOWN_TYPES.CRANE_CAPACITY, 'capacity');
    await assertDropdown(fuelType, DROPDOWN_TYPES.FUEL_TYPE, 'fuel_type', { required: false });
    await assertOperator(body.operator_id, ownerId);

    const registrationNumber = String(body.registration_number || '').trim().toUpperCase();
    if (!registrationNumber) throw new ServiceError('registration_number is required.');
    if (!body.location || !String(body.location).trim()) throw new ServiceError('location is required.');

    const hourlyRate = Number(body.hourly_rate);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) throw new ServiceError('hourly_rate must be greater than 0.');
    const minimumHours = body.minimum_hours === undefined || body.minimum_hours === '' ? 4 : toInt(body.minimum_hours);
    if (!Number.isInteger(minimumHours) || minimumHours < 1) throw new ServiceError('minimum_hours must be at least 1.');

    const availability = body.availability_status === undefined ? 0 : toInt(body.availability_status);
    if (![0, 1].includes(availability)) throw new ServiceError('availability_status must be 0 (available) or 1 (not available).');

    const photos = normalizePhotos(body.photos);
    const documents = await normalizeDocuments(body.documents);

    const duplicate = await Crane.findOne({ where: { registrationNumber }, attributes: ['id'] });
    if (duplicate) throw new ServiceError('A crane with this registration number already exists.', 409);

    // Retry if two owners race for the same crane_code
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const craneId = await sequelize.transaction(async (transaction) => {
          const crane = await Crane.create({
            craneCode: await nextCraneCode(transaction),
            ownerId,
            craneType,
            capacity,
            fuelType,
            modelName: body.model_name || null,
            registrationNumber,
            location: String(body.location).trim(),
            latitude: body.latitude ?? null,
            longitude: body.longitude ?? null,
            hourlyRate,
            minimumHours,
            operatorId: body.operator_id || null,
            availabilityStatus: availability
          }, { transaction });

          await CranePhoto.bulkCreate(
            photos.map((photoUrl, sortOrder) => ({ craneId: crane.id, photoUrl, sortOrder })),
            { transaction }
          );
          await CraneDocument.bulkCreate(
            documents.map((d) => ({ ...d, craneId: crane.id })),
            { transaction }
          );
          return crane.id;
        });
        return formatCrane(await loadCrane(craneId));
      } catch (error) {
        const isCodeClash = error.name === 'SequelizeUniqueConstraintError'
          && error.errors.some((e) => e.path === 'crane_code');
        if (!isCodeClash || attempt === 2) throw error;
      }
    }
  }

  async listOwnerCranes(ownerId = null, { offset = 0, limit = 10 } = {}) {
    const where = {};
    if (ownerId) where.ownerId = ownerId;

    const { rows, count } = await Crane.findAndCountAll({
      where,
      include: craneIncludes,
      distinct: true,
      limit,
      offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return { items: rows.map(formatCrane), total: count };
  }

  /** ownerId = null means admin access (any crane) */
  async getCraneById(id, ownerId = null) {
    const crane = await loadCrane(id, ownerId ? { ownerId } : {});
    if (!crane) throw new ServiceError('Crane not found.', 404);
    return formatCrane(crane);
  }

  async updateCrane(ownerId, id, body) {
    const crane = await Crane.findOne({ where: { id, ownerId } });
    if (!crane) throw new ServiceError('Crane not found.', 404);

    const updates = {};
    if (body.crane_type !== undefined) {
      const v = toInt(body.crane_type);
      await assertDropdown(v, DROPDOWN_TYPES.CRANE_TYPE, 'crane_type');
      updates.craneType = v;
    }
    if (body.capacity !== undefined) {
      const v = toInt(body.capacity);
      await assertDropdown(v, DROPDOWN_TYPES.CRANE_CAPACITY, 'capacity');
      updates.capacity = v;
    }
    if (body.fuel_type !== undefined) {
      const v = toInt(body.fuel_type);
      await assertDropdown(v, DROPDOWN_TYPES.FUEL_TYPE, 'fuel_type', { required: false });
      updates.fuelType = v;
    }
    if (body.model_name !== undefined) updates.modelName = body.model_name || null;
    if (body.registration_number !== undefined) {
      const reg = String(body.registration_number).trim().toUpperCase();
      if (!reg) throw new ServiceError('registration_number cannot be empty.');
      const clash = await Crane.findOne({ where: { registrationNumber: reg, id: { [Op.ne]: id } }, attributes: ['id'] });
      if (clash) throw new ServiceError('A crane with this registration number already exists.', 409);
      updates.registrationNumber = reg;
    }
    if (body.location !== undefined) {
      if (!String(body.location).trim()) throw new ServiceError('location cannot be empty.');
      updates.location = String(body.location).trim();
    }
    if (body.latitude !== undefined) updates.latitude = body.latitude;
    if (body.longitude !== undefined) updates.longitude = body.longitude;
    if (body.hourly_rate !== undefined) {
      const rate = Number(body.hourly_rate);
      if (!Number.isFinite(rate) || rate <= 0) throw new ServiceError('hourly_rate must be greater than 0.');
      updates.hourlyRate = rate;
    }
    if (body.minimum_hours !== undefined) {
      const hrs = toInt(body.minimum_hours);
      if (!Number.isInteger(hrs) || hrs < 1) throw new ServiceError('minimum_hours must be at least 1.');
      updates.minimumHours = hrs;
    }
    if (body.operator_id !== undefined) {
      await assertOperator(body.operator_id, ownerId);
      updates.operatorId = body.operator_id || null;
    }
    if (body.availability_status !== undefined) {
      const v = toInt(body.availability_status);
      if (![0, 1].includes(v)) throw new ServiceError('availability_status must be 0 or 1.');
      updates.availabilityStatus = v;
    }

    const photos = body.photos !== undefined ? normalizePhotos(body.photos) : null;
    const documents = body.documents !== undefined ? await normalizeDocuments(body.documents) : null;

    // Identity / compliance changes, or fixing a rejected crane, go back to admin review
    const reviewTriggers = ['craneType', 'capacity', 'registrationNumber'];
    const needsReview = crane.approvalStatus === CRANE_APPROVAL_STATUS.REJECTED
      || reviewTriggers.some((k) => updates[k] !== undefined && updates[k] !== crane[k])
      || documents !== null;
    if (needsReview) Object.assign(updates, RESET_TO_REVIEW());

    await sequelize.transaction(async (transaction) => {
      await crane.update(updates, { transaction });
      if (photos) {
        await CranePhoto.destroy({ where: { craneId: id }, transaction });
        await CranePhoto.bulkCreate(photos.map((photoUrl, sortOrder) => ({ craneId: id, photoUrl, sortOrder })), { transaction });
      }
      if (documents) {
        await CraneDocument.destroy({ where: { craneId: id }, transaction });
        await CraneDocument.bulkCreate(documents.map((d) => ({ ...d, craneId: id })), { transaction });
      }
    });

    return formatCrane(await loadCrane(id));
  }

  /** "Upload Document" screen: add / replace documents without touching the rest */
  async saveDocuments(ownerId, id, documents) {
    const crane = await Crane.findOne({ where: { id, ownerId }, attributes: ['id'] });
    if (!crane) throw new ServiceError('Crane not found.', 404);
    const docs = await normalizeDocuments(documents);

    await sequelize.transaction(async (transaction) => {
      for (const d of docs) {
        const existing = await CraneDocument.findOne({ where: { craneId: id, documentType: d.documentType }, transaction });
        if (existing) await existing.update({ fileUrl: d.fileUrl, expiryDate: d.expiryDate }, { transaction });
        else await CraneDocument.create({ ...d, craneId: id }, { transaction });
      }
      await Crane.update(RESET_TO_REVIEW(), { where: { id }, transaction });
    });

    return formatCrane(await loadCrane(id));
  }

  // ---------------- Admin ----------------

  async listAllCranes(query = {}, { offset = 0, limit = 10 } = {}) {
    const where = {};
    const status = toInt(query.approval_status);
    if (status !== null && !Number.isNaN(status)) where.approvalStatus = status;
    if (query.search) {
      const term = `%${String(query.search).trim()}%`;
      where[Op.or] = [
        { craneCode: { [Op.iLike]: term } },
        { registrationNumber: { [Op.iLike]: term } },
        { location: { [Op.iLike]: term } }
      ];
    }

    const { rows, count } = await Crane.findAndCountAll({
      where,
      include: craneIncludes,
      distinct: true,
      limit,
      offset,
      // pending first, oldest submission first so nothing breaches the review window
      order: [['approvalStatus', 'ASC'], ['submittedAt', 'ASC']]
    });

    const counts = await Crane.findAll({
      attributes: ['approvalStatus', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['approvalStatus'],
      raw: true
    });
    const summary = { under_review: 0, verified: 0, rejected: 0 };
    counts.forEach((r) => {
      const key = { 0: 'under_review', 1: 'verified', 2: 'rejected' }[r.approvalStatus];
      if (key) summary[key] = Number(r.total);
    });

    return { items: rows.map(formatCrane), total: count, summary };
  }

  async approveCrane(id, adminId) {
    const crane = await Crane.findByPk(id);
    if (!crane) throw new ServiceError('Crane not found.', 404);
    await crane.update({
      approvalStatus: CRANE_APPROVAL_STATUS.VERIFIED,
      rejectionReason: null,
      reviewedAt: new Date(),
      reviewedBy: adminId
    });
    return formatCrane(await loadCrane(id));
  }

  async rejectCrane(id, adminId, reason) {
    const trimmed = String(reason || '').trim();
    if (!trimmed) throw new ServiceError('A rejection reason is required.');
    const crane = await Crane.findByPk(id);
    if (!crane) throw new ServiceError('Crane not found.', 404);
    await crane.update({
      approvalStatus: CRANE_APPROVAL_STATUS.REJECTED,
      rejectionReason: trimmed,
      reviewedAt: new Date(),
      reviewedBy: adminId
    });
    return formatCrane(await loadCrane(id));
  }
}

module.exports = { craneService: new CraneService(), ServiceError };
