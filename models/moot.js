'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Moot extends Model {
		static associate(models) {
		}
  };
	/*  0 = because, 1 = but, 2 = however, 3 = fallacy */
  Moot.init({
		uuid: DataTypes.STRING,
		statusId: DataTypes.STRING,
		type: {
			type: DataTypes.ENUM('0', '1', '2', '3'),
			allowNull: true
		},
		repliedTo: DataTypes.STRING
  }, {
    sequelize, modelName: 'Moot',
  });
  return Moot;
};
