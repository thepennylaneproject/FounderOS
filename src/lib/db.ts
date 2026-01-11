import { Pool, PoolClient } from 'pg';

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

/**
 * Get a client from the pool for manual transaction handling
 * IMPORTANT: Always call client.release() in a finally block
 */
export const getClient = async (): Promise<PoolClient> => {
    return pool.connect();
};

/**
 * Helper for executing queries on a client (useful in transactions)
 */
export const queryClient = async (client: PoolClient, text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await client.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query on client', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('database query error on client', { text, error });
        throw error;
    }
};

/**
 * Helper function for running code in a transaction
 * Automatically handles BEGIN, COMMIT, ROLLBACK
 */
export const withTransaction = async <T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export default pool;
