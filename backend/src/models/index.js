const { sequelize } = require('../config/database');
const defineRole = require('./Role');
const defineAdmin = require('./Admin');
const defineStaticDropdown = require('./StaticDropdown');
const defineUser = require('./User');

const Role = defineRole(sequelize);
const Admin = defineAdmin(sequelize);
const StaticDropdown = defineStaticDropdown(sequelize);
const User = defineUser(sequelize);

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

module.exports = {
  sequelize,
  Role,
  Admin,
  StaticDropdown,
  User
};
