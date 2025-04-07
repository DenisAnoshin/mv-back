import { DataTypes, Sequelize } from 'sequelize';
import { DB, USER, PASSWORD, HOST, dialect as _dialect } from '../config/db.config.js';
import Group from './group.model.js';
import Like from './like.model.js';
import Message from './message.model.js';
import User from './user.model.js';


const sequelize = new Sequelize(DB, USER, PASSWORD, {
    host: HOST,
    dialect: _dialect,
    //operatorsAliases: false,
    port: 5433,
    sync: true,
    define: {
        underscored: true,
        //reezeTableName: true, // предотвращает автоматическое добавление множественного числа к именам таблиц
        timestamps: true, // createdAt и updatedAt
        createdAt: 'created_at', // snake_case для временных меток
        updatedAt: 'updated_at'
    }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Group = Group(sequelize, Sequelize);
db.Like = Like(sequelize, Sequelize);
db.Message = Message(sequelize, Sequelize);
db.User = User(sequelize, Sequelize);
// Группа принадлежит пользователю (админу)
db.Group.belongsTo(db.User, { 
    as: 'groupAdmin',
    foreignKey: 'admin_id' // явно указываем snake_case
  });
  
  // Пользователь имеет много групп
  db.User.hasMany(db.Group, { 
    as: 'groups',
    foreignKey: 'admin_id' // должно совпадать с belongsTo
  });
  
  // Многие ко многим User-Group
  db.User.belongsToMany(db.Group, { 
    through: 'user_group', // snake_case для таблицы связи
    foreignKey: 'user_id'
  });
  db.Group.belongsToMany(db.User, { 
    through: 'user_group',
    foreignKey: 'group_id'
  });
  
  // Сообщения
  db.User.hasMany(db.Message, { foreignKey: 'user_id' });
  db.Message.belongsTo(db.User, { foreignKey: 'user_id' });
  
  db.Group.hasMany(db.Message, { foreignKey: 'group_id' });
  db.Message.belongsTo(db.Group, { foreignKey: 'group_id' });
  
  // Лайки
  db.Message.hasMany(db.Like, { foreignKey: 'message_id' });
  db.Like.belongsTo(db.Message, { foreignKey: 'message_id' });
  
  db.User.hasMany(db.Like, { foreignKey: 'user_id' });
  db.Like.belongsTo(db.User, { foreignKey: 'user_id' });

export default db;