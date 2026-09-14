import mysql from 'mysql2/promise';
import fs from 'node:fs';
import 'dotenv/config';

const ssl = process.env.DB_SSL === 'true' ? {
  rejectUnauthorized: true,
  ca: process.env.DB_CA_PATH ? fs.readFileSync(process.env.DB_CA_PATH) : undefined
} : undefined;

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
  waitForConnections: true,
  connectionLimit: 8,
  namedPlaceholders: false
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
