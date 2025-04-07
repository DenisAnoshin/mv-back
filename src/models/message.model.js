import { DataTypes } from 'sequelize';

const Message = (sequelize, Sequelize) => {
    const Message = sequelize.define('message', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        content: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    return Message;
}
export default Message;