// src/common/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { User } from '../users/users.entity';
import { Group } from '../groups/groups.entity';
import { UsersGroups } from '../users_groups/users_groups.entity';
import { Message } from '../messages/messages.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Group, UsersGroups, Message],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  migrationsRun: true,
};

const AppDataSource = new DataSource({
  ...dataSourceOptions,
  migrations: ['src/migrations/*.ts'],
});

export default AppDataSource;
