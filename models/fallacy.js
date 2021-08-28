'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Fallacy extends Model {
		static associate(models) {
			Fallacy.hasMany(models.Moot, {
				foreignKey: 'fallacyId'
			})
		}
  };

  Fallacy.init({
		name: DataTypes.STRING,
		source: {
			type: DataTypes.STRING(255),
			get: function(){
				return JSON.parse(this.getDataValue("source"))
			}
		},
  }, {
    sequelize, modelName: 'Fallacy',
  });
  return Fallacy;
};
