const { sequelize } = require('../config/database');
const defineRole = require('./Role');
const defineAdmin = require('./Admin');
const defineStaticDropdown = require('./StaticDropdown');
const defineUser = require('./User');
const defineCrane = require('./Crane');
const defineCranePhoto = require('./CranePhoto');
const defineCraneDocument = require('./CraneDocument');

const Role = defineRole(sequelize);
const Admin = defineAdmin(sequelize);
const StaticDropdown = defineStaticDropdown(sequelize);
const User = defineUser(sequelize);
const Crane = defineCrane(sequelize);
const CranePhoto = defineCranePhoto(sequelize);
const CraneDocument = defineCraneDocument(sequelize);

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

module.exports = {
  sequelize,
  Role,
  Admin,
  StaticDropdown,
  User,
  Crane,
  CranePhoto,
  CraneDocument
};
