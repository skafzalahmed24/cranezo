const { DataTypes } = require('sequelize');

/** An owner asks a registered operator to join their team: the operator accepts or declines */
module.exports = (sequelize) => sequelize.define('OperatorInvite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
  operatorId: { type: DataTypes.UUID, allowNull: false, field: 'operator_id' },
  salaryType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'monthly', field: 'salary_type' },
  monthlySalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'monthly_salary' },
  dailyWage: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'daily_wage' },
  batta: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  message: { type: DataTypes.STRING(300), allowNull: true },
  status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '0 waiting, 1 accepted, 2 declined, 3 cancelled, 4 expired' },
  respondedAt: { type: DataTypes.DATE, allowNull: true, field: 'responded_at' }
}, { tableName: 'operator_invites', underscored: true, timestamps: true });
