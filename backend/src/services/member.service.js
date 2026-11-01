const { Op, fn, col } = require('sequelize');
const { User, Crane, CraneDocument, StaticDropdown, Role } = require('../models');
const { CRANE_APPROVAL_LABELS } = require('../constants/roles');

const ROLE_BY_KIND = { owners: 1, operators: 2, users: 3 };
const ROLE_NAMES = { 1: 'Crane Owner', 2: 'Operator', 3: 'Customer' };

class MemberServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const iso = (d) => (d ? new Date(d).toISOString() : null);
const dropdownName = (info) => (info ? info.dropdownName : null);
const location = (u) => [u.city, u.state].filter(Boolean).join(', ') || null;

const detailIncludes = [
  { model: Role, as: 'role', attributes: ['id', 'name', 'code'] },
  { model: StaticDropdown, as: 'language', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'ownerTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'experienceInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'partnersInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'ownershipTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'operatorTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'customerTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'constitutionInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'natureOfBusinessInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'stateInfo', attributes: ['id', 'dropdownName'] },
  { model: User, as: 'ownerAccount', attributes: ['id', 'memberId', 'fullName', 'companyName', 'mobileNumber', 'countryCode'] }
];

/** Fields shared by list rows and the detail view */
const baseMember = (u) => ({
  id: u.id,
  member_id: u.memberId,
  role_id: u.roleId,
  role_name: ROLE_NAMES[u.roleId] || null,
  full_name: u.fullName,
  company_name: u.companyName,
  user_email: u.userEmail,
  country_code: u.countryCode,
  mobile_number: u.mobileNumber,
  contact: [u.countryCode, u.mobileNumber].filter(Boolean).join(' '),
  profile_image: u.profileImage,
  city: u.city,
  state: u.state,
  location: location(u),
  is_mobile_verified: u.isMobileVerified === 0,
  status: u.isActive === 0 ? 0 : 1,
  status_label: u.isActive === 0 ? 'Active' : 'Blocked',
  joined_at: iso(u.createdAt)
});

const craneSummary = (c) => ({
  id: c.id,
  crane_code: c.craneCode,
  crane_type_name: c.craneTypeInfo ? c.craneTypeInfo.dropdownName : null,
  capacity_name: c.capacityInfo ? c.capacityInfo.dropdownName : null,
  registration_number: c.registrationNumber,
  location: c.location,
  availability_label: c.availabilityStatus === 0 ? 'Available' : 'Not Available',
  approval_status: c.approvalStatus,
  approval_label: CRANE_APPROVAL_LABELS[c.approvalStatus]
});

const craneInclude = [
  { model: StaticDropdown, as: 'craneTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'capacityInfo', attributes: ['id', 'dropdownName'] }
];

const endOfThisMonthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

class MemberService {
  roleIdFor(input) {
    const roleId = Number(input);
    if (![1, 2, 3].includes(roleId)) throw new MemberServiceError('role_id must be 1 (owner), 2 (operator) or 3 (customer).');
    return roleId;
  }

  /** KPI cards for one role */
  async summary(roleId) {
    const base = { roleId, isDeleted: 0 };
    const [total, active, blocked, newThisMonth, mobileVerified] = await Promise.all([
      User.count({ where: base }),
      User.count({ where: { ...base, isActive: 0 } }),
      User.count({ where: { ...base, isActive: 1 } }),
      User.count({ where: { ...base, createdAt: { [Op.gte]: endOfThisMonthStart() } } }),
      User.count({ where: { ...base, isMobileVerified: 0 } })
    ]);
    return { total, active, blocked, new_this_month: newThisMonth, mobile_verified: mobileVerified };
  }

  async list(input, { offset, limit }) {
    const roleId = this.roleIdFor(input.role_id);
    const where = { roleId, isDeleted: 0 };

    if (input.status !== undefined && input.status !== null && input.status !== '') {
      const status = Number(input.status);
      if (![0, 1].includes(status)) throw new MemberServiceError('status must be 0 (active) or 1 (blocked).');
      where.isActive = status;
    }
    if (input.search && String(input.search).trim()) {
      const term = `%${String(input.search).trim()}%`;
      where[Op.or] = [
        { fullName: { [Op.iLike]: term } },
        { companyName: { [Op.iLike]: term } },
        { mobileNumber: { [Op.iLike]: term } },
        { userEmail: { [Op.iLike]: term } },
        { memberId: { [Op.iLike]: term } },
        { city: { [Op.iLike]: term } }
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      include: [{ model: User, as: 'ownerAccount', attributes: ['id', 'memberId', 'fullName', 'companyName'] }],
      limit,
      offset,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });

    const ids = rows.map((u) => u.id);
    const craneStats = await this.craneStatsFor(roleId, ids);

    const items = rows.map((u) => {
      const item = baseMember(u);
      if (roleId === 1) {
        const s = craneStats.get(u.id) || { total: 0, verified: 0 };
        item.cranes_total = s.total;
        item.cranes_verified = s.verified;
        item.bookings = 0; // bookings module not built yet
      } else if (roleId === 2) {
        const assigned = craneStats.get(u.id) || [];
        item.operator_license_number = u.operatorLicenseNumber;
        item.license_expiry_date = u.licenseExpiryDate;
        item.owner = u.ownerAccount ? {
          id: u.ownerAccount.id,
          member_id: u.ownerAccount.memberId,
          full_name: u.ownerAccount.fullName,
          company_name: u.ownerAccount.companyName
        } : null;
        item.source = u.ownerId ? 'owner_added' : 'registered';
        item.assigned_cranes = assigned.map(craneSummary);
        item.assigned_crane = assigned.length ? craneSummary(assigned[0]) : null;
        item.availability_label = assigned.length ? 'Assigned' : 'Available';
      } else {
        item.bookings = 0; // bookings module not built yet
        item.total_spent = 0;
      }
      return item;
    });

    return { items, total: count };
  }

  /** Owners: crane counts. Operators: the cranes assigned to them. Customers: nothing */
  async craneStatsFor(roleId, ids) {
    const result = new Map();
    if (!ids.length) return result;

    if (roleId === 1) {
      const rows = await Crane.findAll({
        attributes: ['ownerId', 'approvalStatus', [fn('COUNT', col('id')), 'n']],
        where: { ownerId: { [Op.in]: ids } },
        group: ['ownerId', 'approvalStatus'],
        raw: true
      });
      rows.forEach((r) => {
        const s = result.get(r.ownerId) || { total: 0, verified: 0 };
        s.total += Number(r.n);
        if (r.approvalStatus === 1) s.verified += Number(r.n);
        result.set(r.ownerId, s);
      });
    } else if (roleId === 2) {
      const cranes = await Crane.findAll({
        where: { operatorId: { [Op.in]: ids } },
        include: craneInclude,
        order: [['createdAt', 'DESC']]
      });
      cranes.forEach((c) => {
        const list = result.get(c.operatorId) || [];
        list.push(c);
        result.set(c.operatorId, list);
      });
    }
    return result;
  }

  async get(userId) {
    const user = await User.findOne({ where: { id: userId, isDeleted: 0 }, include: detailIncludes });
    if (!user || ![1, 2, 3].includes(user.roleId)) throw new MemberServiceError('Member not found.', 404);

    const profile = {
      ...baseMember(user),
      business_address: user.businessAddress,
      country: user.country,
      pincode: user.pincode,
      language: dropdownName(user.language),
      last_device_platform: user.platformType,
      years_of_experience: dropdownName(user.experienceInfo),
      company_date_establishment: user.companyDateEstablishment,
      business_category: user.businessCategory
    };

    if (user.roleId === 1) {
      Object.assign(profile, {
        owner_type: dropdownName(user.ownerTypeInfo),
        number_of_business_partners: dropdownName(user.partnersInfo),
        business_ownership_type: dropdownName(user.ownershipTypeInfo)
      });
      const cranes = await Crane.findAll({
        where: { ownerId: user.id },
        include: craneInclude,
        order: [['createdAt', 'DESC']]
      });
      profile.cranes = cranes.map(craneSummary);
      profile.cranes_total = cranes.length;
      profile.cranes_verified = cranes.filter((c) => c.approvalStatus === 1).length;
      profile.operators = (await User.findAll({
        where: { ownerId: user.id, roleId: 2, isDeleted: 0 },
        attributes: ['id', 'memberId', 'fullName', 'mobileNumber', 'countryCode']
      })).map((o) => ({ id: o.id, member_id: o.memberId, full_name: o.fullName, contact: `${o.countryCode || ''} ${o.mobileNumber || ''}`.trim() }));
    }

    if (user.roleId === 2) {
      Object.assign(profile, {
        operator_type_name: dropdownName(user.operatorTypeInfo),
        operator_license_number: user.operatorLicenseNumber,
        license_expiry_date: user.licenseExpiryDate,
        license_expired: user.licenseExpiryDate ? user.licenseExpiryDate < new Date().toISOString().slice(0, 10) : null,
        source: user.ownerId ? 'owner_added' : 'registered',
        owner: user.ownerAccount ? {
          id: user.ownerAccount.id,
          member_id: user.ownerAccount.memberId,
          full_name: user.ownerAccount.fullName,
          company_name: user.ownerAccount.companyName,
          contact: `${user.ownerAccount.countryCode || ''} ${user.ownerAccount.mobileNumber || ''}`.trim()
        } : null,
        documents: [
          { label: 'Operator License (Front)', file_url: user.operatorLicenseFront },
          { label: 'Operator License (Back)', file_url: user.operatorLicenseBack },
          { label: 'Aadhaar Card', file_url: user.aadharCardFile },
          { label: 'PAN Card', file_url: user.panCardFile },
          { label: 'Other Documents', file_url: user.otherDocumentFile }
        ]
      });
      const assigned = await Crane.findAll({ where: { operatorId: user.id }, include: craneInclude });
      profile.assigned_cranes = assigned.map(craneSummary);
    }

    if (user.roleId === 3) {
      Object.assign(profile, {
        customer_type_name: dropdownName(user.customerTypeInfo),
        constitution_name: dropdownName(user.constitutionInfo),
        nature_of_business_name: dropdownName(user.natureOfBusinessInfo),
        state_name: dropdownName(user.stateInfo) || user.state,
        gst_number: user.gstNumber,
        aadhar_number: user.aadharNumber,
        pan_number: user.panNumber,
        directors_details: user.directorsDetails,
        finance_head_details: user.financeHeadDetails,
        branch_offices_details: user.branchOfficesDetails,
        bookings: 0,
        total_spent: 0
      });
    }

    return profile;
  }

  async setStatus(userId, status) {
    const value = Number(status);
    if (![0, 1].includes(value)) throw new MemberServiceError('status must be 0 (active) or 1 (blocked).');
    const user = await User.findOne({ where: { id: userId, isDeleted: 0 } });
    if (!user || ![1, 2, 3].includes(user.roleId)) throw new MemberServiceError('Member not found.', 404);
    await user.update({ isActive: value });
    return this.get(userId);
  }
}

module.exports = { memberService: new MemberService(), MemberServiceError, ROLE_BY_KIND };
