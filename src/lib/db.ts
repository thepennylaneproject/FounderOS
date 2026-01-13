import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Use service role key for server-side operations (bypasses RLS)
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration. Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
}

// Create Supabase client
const supabase: SupabaseClient = createClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Execute a raw SQL query via Supabase's rpc.
 * 
 * IMPORTANT: For this to work, you need to create a Postgres function in Supabase:
 * 
 * CREATE OR REPLACE FUNCTION run_raw_sql(query_text TEXT, query_params JSONB DEFAULT '[]')
 * RETURNS JSONB
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * DECLARE
 *   result JSONB;
 * BEGIN
 *   EXECUTE query_text INTO result USING query_params;
 *   RETURN result;
 * END;
 * $$;
 * 
 * However, for now we'll use a simpler approach with direct table access.
 */

// Type for query results that matches pg's interface
interface QueryResult {
    rows: any[];
    rowCount: number;
}

/**
 * Query function that maintains compatibility with pg-style queries.
 * Uses Supabase's PostgREST API for table operations.
 * 
 * Note: This is a simplified implementation that handles common patterns.
 * For complex queries, consider using Supabase's query builder directly.
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
    const start = Date.now();
    
    try {
        // Parse the query to determine the operation
        const normalizedQuery = text.trim().toLowerCase();
        
        // For simple SELECT * FROM table queries, use Supabase client
        // This is a workaround since direct SQL isn't easily available
        
        // Log the query attempt
        console.log('Query requested:', { text: text.substring(0, 100), params });
        
        // Use Supabase's raw SQL via postgres connection
        // This requires the service role key
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: text,
            sql_params: params || []
        });

        if (error) {
            // If the RPC doesn't exist, provide a helpful error
            if (error.code === 'PGRST202') {
                console.error('exec_sql RPC not found. Please create it in Supabase SQL Editor:');
                console.error(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- This handles queries that return rows by aggregating them into JSON
    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
    -- Fallback for non-SELECT queries (INSERT/UPDATE)
    EXECUTE sql_query;
    RETURN '[]'::JSONB;
END;
$$;
                `);
            }
            throw error;
        }
        
        const duration = Date.now() - start;
        const rows = Array.isArray(data) ? data : (data ? [data] : []);
        console.log('executed query', { text: text.substring(0, 50), duration, rows: rows.length });
        
        return { rows, rowCount: rows.length };
    } catch (error) {
        console.error('database query error', { text, error });
        throw error;
    }
};

// Export supabase client as default (replaces pg pool)
export default supabase;
