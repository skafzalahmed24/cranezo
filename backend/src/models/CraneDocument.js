const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CraneDocument = sequelize.define('CraneDocument', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    craneId: { type: DataTypes.UUID, allowNull: false, field: 'crane_id' },
    documentType: { type: DataTypes.INTEGER, allowNull: false, field: 'document_type', comment: 'Static dropdown ID (type 9)' },
    fileUrl: { type: DataTypes.STRING, allowNull: false, field: 'file_url' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' }
  }, {
    tableName: 'crane_documents',
    underscored: true,
    timestamps: true
  });

  return CraneDocument;
};
