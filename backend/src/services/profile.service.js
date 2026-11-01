const { Op } = require('sequelize');
const { User, StaticDropdown } = require('../models');
const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');

const ROLE_OWNER = 1;
const ROLE_OPERATOR = 2;
const ROLE_CUSTOMER = 3;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const text = (value) => String(value).trim();

const toDropdownId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new Error(`${label} must be a valid dropdown id.`);
  return id;
};

/** Returns the active dropdown row, or throws when the id is not an active value of that type */
async function requireDropdown(value, type, label) {
  const id = toDropdownId(value, label);
  const row = await StaticDropdown.findOne({
    where: { id, dropdownType: type, dropdownTypeStatus: 0 },
    attributes: ['id', 'dropdownName']
  });
  if (!row) throw new Error(`${label} is not a valid option.`);
  return row;
}

const requireFields = (input, fields) => {
  const missing = fields.filter(([key]) => isBlank(input[key])).map(([key]) => key);
  if (missing.length) throw new Error(`${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required.`);
};

const parseDate = (value, label) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid date (YYYY-MM-DD).`);
  }
  return String(value);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Operator profile (role 2): license details, experience, documents and
 * individual / owner-based type. Owner based operators link to a crane owner
 * through that owner's member id (e.g. ONR123456).
 */
async function applyOperatorProfile(user, input) {
  requireFields(input, [
    ['operator_license_number', 'operator_license_number'],
    ['license_expiry_date', 'license_expiry_date'],
    ['years_of_experience', 'years_of_experience'],
    ['operator_type', 'operator_type'],
    ['operator_license_front', 'operator_license_front'],
    ['operator_license_back', 'operator_license_back']
  ]);

  const licenseNumber = text(input.operator_license_number).toUpperCase();
  const duplicate = await User.findOne({
    where: { operatorLicenseNumber: licenseNumber, id: { [Op.ne]: user.id } },
    attributes: ['id']
  });
  if (duplicate) throw new Error('This operator license number is already registered.');

  const expiry = parseDate(input.license_expiry_date, 'license_expiry_date');
  // an already stored (older) expiry date must not block unrelated edits such as replacing the PAN card
  if (expiry < todayIso() && expiry !== user.licenseExpiryDate) {
    throw new Error('Operator license has expired. Please provide a valid license.');
  }

  await requireDropdown(input.years_of_experience, DROPDOWN_TYPES.YEARS_OF_EXPERIENCE, 'years_of_experience');
  const operatorType = await requireDropdown(input.operator_type, DROPDOWN_TYPES.OPERATOR_TYPE, 'operator_type');

  let ownerAccountId = null;
  if (operatorType.dropdownName === 'Owner Based') {
    if (isBlank(input.owner_id)) throw new Error('owner_id is required for owner based operators.');
    const owner = await User.findOne({
      where: { memberId: text(input.owner_id).toUpperCase(), roleId: ROLE_OWNER, isDeleted: 0 },
      attributes: ['id']
    });
    if (!owner) throw new Error('Owner ID not found. Please check the crane owner ID.');
    ownerAccountId = owner.id;
  }

  user.operatorLicenseNumber = licenseNumber;
  user.licenseExpiryDate = expiry;
  user.yearsOfExperience = Number(input.years_of_experience);
  user.operatorType = operatorType.id;
  user.ownerId = ownerAccountId; // cleared when switching back to an individual operator
  user.operatorLicenseFront = input.operator_license_front;
  user.operatorLicenseBack = input.operator_license_back;
  if (input.aadhar_card_file !== undefined) user.aadharCardFile = input.aadhar_card_file || null;
  if (input.pan_card_file !== undefined) user.panCardFile = input.pan_card_file || null;
  if (input.other_document_file !== undefined) user.otherDocumentFile = input.other_document_file || null;
}

/**
 * Customer profile (role 3): individual user (Aadhar, PAN, city, state)
 * or business user (company, constitution, GST, directors ...).
 */
async function applyCustomerProfile(user, input) {
  requireFields(input, [['customer_type', 'customer_type']]);
  const customerType = await requireDropdown(input.customer_type, DROPDOWN_TYPES.CUSTOMER_TYPE, 'customer_type');
  user.customerType = customerType.id;

  if (customerType.dropdownName === 'Business User') {
    requireFields(input, [
      ['company_name', 'company_name'],
      ['business_address', 'business_address'],
      ['constitution', 'constitution'],
      ['company_date_establishment', 'company_date_establishment'],
      ['gst_number', 'gst_number'],
      ['nature_of_business', 'nature_of_business']
    ]);

    const gst = text(input.gst_number).toUpperCase();
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) throw new Error('gst_number is not a valid GST registration number.');
    const established = parseDate(input.company_date_establishment, 'company_date_establishment');
    if (established > todayIso()) throw new Error('company_date_establishment cannot be in the future.');

    const constitution = await requireDropdown(input.constitution, DROPDOWN_TYPES.CONSTITUTION, 'constitution');
    const nature = await requireDropdown(input.nature_of_business, DROPDOWN_TYPES.NATURE_OF_BUSINESS, 'nature_of_business');

    user.companyName = text(input.company_name);
    user.businessAddress = text(input.business_address);
    user.constitution = constitution.id;
    user.companyDateEstablishment = established;
    user.gstNumber = gst;
    user.natureOfBusiness = nature.id;
    if (input.directors_details !== undefined) user.directorsDetails = input.directors_details || null;
    if (input.finance_head_details !== undefined) user.financeHeadDetails = input.finance_head_details || null;
    if (input.branch_offices_details !== undefined) user.branchOfficesDetails = input.branch_offices_details || null;
    return;
  }

  // Individual user
  requireFields(input, [
    ['aadhar_number', 'aadhar_number'],
    ['pan_number', 'pan_number'],
    ['city', 'city']
  ]);
  if (isBlank(input.state_id) && isBlank(input.state)) throw new Error('state_id is required.');

  const aadhar = text(input.aadhar_number).replace(/\s+/g, '');
  if (!/^\d{12}$/.test(aadhar)) throw new Error('aadhar_number must be 12 digits.');
  const pan = text(input.pan_number).toUpperCase();
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) throw new Error('pan_number is not a valid PAN (e.g. ABCDE1234F).');

  user.aadharNumber = aadhar;
  user.panNumber = pan;
  user.city = text(input.city);
  if (!isBlank(input.state_id)) {
    const state = await requireDropdown(input.state_id, DROPDOWN_TYPES.STATE, 'state_id');
    user.stateId = state.id;
    user.state = state.dropdownName;
  } else {
    user.state = text(input.state);
  }
}

module.exports = {
  ROLE_OWNER,
  ROLE_OPERATOR,
  ROLE_CUSTOMER,
  applyOperatorProfile,
  applyCustomerProfile
};
