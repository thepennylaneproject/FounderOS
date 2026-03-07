import { Pool } from 'pg';

// Get database connection string from environment
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.warn('Missing DATABASE_URL or POSTGRES_URL. Database queries using the pool will fail.');
}

// Create a new pool using the connection string
// For production, enforce SSL certificate verification
export const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString?.includes('supa') ? {
        rejectUnauthorized: true,
        ca: process.env.DATABASE_SSL_CA ? process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') : undefined
    } : undefined,
    // Add simple query timeout
    query_timeout: 10000,
});

/**
 * Execute a query against the database using the connection pool.
 * This restores the direct PostgreSQL connection capability.
 */
export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('database query error', { text, error });
        throw error;
    }
};

// Re-export pool for direct access if needed
export default pool;
