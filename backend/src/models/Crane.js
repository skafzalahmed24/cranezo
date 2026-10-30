const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Crane = sequelize.define('Crane', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    craneCode: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: 'crane_code' },
    ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
    craneType: { type: DataTypes.INTEGER, allowNull: false, field: 'crane_type', comment: 'Static dropdown ID (type 6)' },
    capacity: { type: DataTypes.INTEGER, allowNull: false, comment: 'Static dropdown ID (type 7)' },
    fuelType: { type: DataTypes.INTEGER, allowNull: true, field: 'fuel_type', comment: 'Static dropdown ID (type 8)' },
    modelName: { type: DataTypes.STRING(150), allowNull: true, field: 'model_name' },
    registrationNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'registration_number' },
    location: { type: DataTypes.STRING(255), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    hourlyRate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'hourly_rate' },
    minimumHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4, field: 'minimum_hours' },
    operatorId: { type: DataTypes.UUID, allowNull: true, field: 'operator_id' },
    availabilityStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'availability_status', comment: '0 available, 1 not available' },
    approvalStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'approval_status', comment: '0 under review, 1 verified, 2 rejected' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: 'rejection_reason' },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'submitted_at' },
    reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
    reviewedBy: { type: DataTypes.UUID, allowNull: true, field: 'reviewed_by' },
    isActive: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'is_active', comment: '0 active, 1 deactive' }
  }, {
    tableName: 'cranes',
    underscored: true,
    timestamps: true
  });

  return Crane;
};
