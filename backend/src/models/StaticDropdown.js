const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaticDropdown = sequelize.define('StaticDropdown', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    dropdownName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'dropdown_name'
    },
    dropdownDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'dropdown_description'
    },
    dropdownType: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'dropdown_type'
    },
    dropdownTypeStatus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'dropdown_type_status',
      comment: '0 for active, 1 for inactive'
    }
  }, {
    tableName: 'static_dropdowns',
    underscored: true,
    timestamps: true
  });

  return StaticDropdown;
};
