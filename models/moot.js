'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Moot extends Model {
		static associate(models) {
			Moot.hasMany(models.Moot, {
				foreignKey: 'statusId'
			})
		}
  };
	/*  0 = because, 1 = but, 2 = however */
  Moot.init({
		statusId: DataTypes.STRING,
		type: {
			type: DataTypes.ENUM('0', '1', '2'),
			allowNull: true
		},
		repliedTo: DataTypes.STRING
  }, {
    sequelize, modelName: 'Moot',
  });
  return Moot;
};
