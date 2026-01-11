import { Pool } from 'pg';

const sslDisabled = process.env.PGSSLMODE === 'disable' || process.env.DATABASE_SSL === 'false';
const useSSL = process.env.NODE_ENV === 'production' && !sslDisabled;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
});

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('database query error', { text, error });
        throw error;
    }
};

export default pool;
