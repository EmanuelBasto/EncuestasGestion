import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const isRender = (process.env.DATABASE_URL || '').includes('.render.com');
const ssl =
  process.env.NODE_ENV === 'production' || isRender
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl
});

export const query = (text, params) => pool.query(text, params);
