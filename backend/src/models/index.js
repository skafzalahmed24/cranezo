const { sequelize } = require('../config/database');
const defineRole = require('./Role');
const defineAdmin = require('./Admin');
const defineStaticDropdown = require('./StaticDropdown');
const defineUser = require('./User');
const defineCrane = require('./Crane');
const defineCranePhoto = require('./CranePhoto');
const defineCraneDocument = require('./CraneDocument');
const defineLegalPage = require('./LegalPage');
const defineBooking = require('./Booking');
const defineNotification = require('./Notification');
const defineJobPhoto = require('./JobPhoto');
const defineJobIssue = require('./JobIssue');
const defineBookingExtension = require('./BookingExtension');
const defineBookingRating = require('./BookingRating');
const defineSupportSettings = require('./SupportSettings');
const defineFaqCategory = require('./FaqCategory');
const defineFaq = require('./Faq');
const defineSupportTicket = require('./SupportTicket');
const defineSupportMessage = require('./SupportMessage');
const defineAnnouncement = require('./Announcement');
const defineBanner = require('./Banner');

const Role = defineRole(sequelize);
const Admin = defineAdmin(sequelize);
const StaticDropdown = defineStaticDropdown(sequelize);
const User = defineUser(sequelize);
const Crane = defineCrane(sequelize);
const CranePhoto = defineCranePhoto(sequelize);
const CraneDocument = defineCraneDocument(sequelize);
const LegalPage = defineLegalPage(sequelize);
const Booking = defineBooking(sequelize);
const Notification = defineNotification(sequelize);
const JobPhoto = defineJobPhoto(sequelize);
const JobIssue = defineJobIssue(sequelize);
const BookingExtension = defineBookingExtension(sequelize);
const BookingRating = defineBookingRating(sequelize);
const SupportSettings = defineSupportSettings(sequelize);
const FaqCategory = defineFaqCategory(sequelize);
const Faq = defineFaq(sequelize);
const SupportTicket = defineSupportTicket(sequelize);
const SupportMessage = defineSupportMessage(sequelize);
const Announcement = defineAnnouncement(sequelize);
const Banner = defineBanner(sequelize);

// Associations
Admin.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(Admin, { foreignKey: 'role_id', as: 'admins' });

User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

User.belongsTo(StaticDropdown, { foreignKey: 'language_type', as: 'language' });
User.belongsTo(StaticDropdown, { foreignKey: 'owner_type', as: 'ownerTypeInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'years_of_experience', as: 'experienceInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'number_of_business_partners', as: 'partnersInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'business_ownership_type', as: 'ownershipTypeInfo' });

User.belongsTo(User, { foreignKey: 'ownerId', as: 'ownerAccount' });
User.belongsTo(StaticDropdown, { foreignKey: 'operatorType', as: 'operatorTypeInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'customerType', as: 'customerTypeInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'constitution', as: 'constitutionInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'natureOfBusiness', as: 'natureOfBusinessInfo' });
User.belongsTo(StaticDropdown, { foreignKey: 'stateId', as: 'stateInfo' });

Crane.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Crane, { foreignKey: 'ownerId', as: 'cranes' });
Crane.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });
Crane.belongsTo(Admin, { foreignKey: 'reviewedBy', as: 'reviewer' });
Crane.belongsTo(StaticDropdown, { foreignKey: 'craneType', as: 'craneTypeInfo' });
Crane.belongsTo(StaticDropdown, { foreignKey: 'capacity', as: 'capacityInfo' });
Crane.belongsTo(StaticDropdown, { foreignKey: 'fuelType', as: 'fuelTypeInfo' });
Crane.hasMany(CranePhoto, { foreignKey: 'craneId', as: 'photos' });
CranePhoto.belongsTo(Crane, { foreignKey: 'craneId', as: 'crane' });
Crane.hasMany(CraneDocument, { foreignKey: 'craneId', as: 'documents' });
CraneDocument.belongsTo(Crane, { foreignKey: 'craneId', as: 'crane' });
CraneDocument.belongsTo(StaticDropdown, { foreignKey: 'documentType', as: 'documentTypeInfo' });

Booking.belongsTo(Crane, { foreignKey: 'craneId', as: 'crane' });
Crane.hasMany(Booking, { foreignKey: 'craneId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Booking.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Booking.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });
Booking.belongsTo(StaticDropdown, { foreignKey: 'craneType', as: 'craneTypeInfo' });
Booking.belongsTo(StaticDropdown, { foreignKey: 'capacity', as: 'capacityInfo' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
FaqCategory.hasMany(Faq, { foreignKey: 'categoryId', as: 'faqs' });
Faq.belongsTo(FaqCategory, { foreignKey: 'categoryId', as: 'category' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SupportTicket.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
SupportTicket.belongsTo(Admin, { foreignKey: 'assignedAdminId', as: 'assignee' });
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticketId', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket' });
Announcement.belongsTo(Admin, { foreignKey: 'createdBy', as: 'creator' });

Booking.hasMany(BookingExtension, { foreignKey: 'bookingId', as: 'extensions' });
BookingExtension.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Booking.hasOne(BookingRating, { foreignKey: 'bookingId', as: 'rating' });
BookingRating.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Booking.hasMany(JobPhoto, { foreignKey: 'bookingId', as: 'jobPhotos' });
JobPhoto.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Booking.hasMany(JobIssue, { foreignKey: 'bookingId', as: 'issues' });
JobIssue.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
JobIssue.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });
JobIssue.belongsTo(StaticDropdown, { foreignKey: 'breakdownType', as: 'breakdownTypeInfo' });

module.exports = {
  sequelize,
  Role,
  Admin,
  StaticDropdown,
  User,
  Crane,
  CranePhoto,
  CraneDocument,
  LegalPage,
  Booking,
  Notification,
  JobPhoto,
  JobIssue,
  BookingExtension,
  BookingRating,
  SupportSettings,
  FaqCategory,
  Faq,
  SupportTicket,
  SupportMessage,
  Announcement,
  Banner
};
