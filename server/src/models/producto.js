const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
    sequelize.define('producto', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
          },
          name:{
            type: DataTypes.STRING,
            allowNull:false
          },
          precio:{
            type: DataTypes.FLOAT,
            allowNull:false
          },
          descripcion:{
            type: DataTypes.STRING,
            allowNull:false
          },
          status:{
            type: DataTypes.BOOLEAN,
            allowNull:false
          },
          code:{
            type: DataTypes.STRING,
            allowNull:false
          },
          image_url:{
            type: DataTypes.STRING,
            allowNull:false
          },
          stock:{
            type: DataTypes.FLOAT,
            allowNull:false
          },
    }, { timestamps: false });
}