import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // База данных из .env
  ssl: { rejectUnauthorized: false }, // Для работы с Neon/Vercel
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
