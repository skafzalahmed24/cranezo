// Static dropdown type identifiers (static_dropdowns.dropdown_type)
const DROPDOWN_TYPES = {
  LANGUAGE: 1,
  OWNER_TYPE: 2,
  YEARS_OF_EXPERIENCE: 3,
  BUSINESS_PARTNERS: 4,
  OWNERSHIP_TYPE: 5,
  CRANE_TYPE: 6,
  CRANE_CAPACITY: 7,
  FUEL_TYPE: 8,
  CRANE_DOCUMENT_TYPE: 9
};

// Labels shown in Admin > Settings
const DROPDOWN_TYPE_LABELS = {
  1: 'Language',
  2: 'Owner Type',
  3: 'Years of Experience',
  4: 'Number of Business Partners',
  5: 'Business Ownership Type',
  6: 'Crane Type',
  7: 'Crane Capacity',
  8: 'Fuel Type',
  9: 'Crane Document Type'
};

module.exports = { DROPDOWN_TYPES, DROPDOWN_TYPE_LABELS };
