// db.config.js
import dotenv from 'dotenv';
dotenv.config();

export const HOST = process.env.DB_HOST || "localhost";
export const USER = process.env.DB_USER || "listik";
export const PASSWORD = process.env.DB_PASSWORD || "root";
export const DB = process.env.DB_NAME || "chat";
export const dialect = process.env.DB_DIALECT || "postgres";
