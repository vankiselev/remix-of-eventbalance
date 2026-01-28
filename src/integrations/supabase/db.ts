/**
 * Type-safe wrapper for Supabase client operations
 * This handles the mismatch between Lovable Cloud types and self-hosted database schema
 */
import { supabase } from './client';

// Type alias for any table operations - bypasses type checking for tables not in Lovable Cloud schema
type AnyTable = any;

/**
 * Get a table reference that bypasses Lovable Cloud type checking
 * Use this when accessing tables that exist on self-hosted but not in Lovable Cloud types
 */
export const getTable = (tableName: string): AnyTable => {
  return (supabase.from as any)(tableName);
};

/**
 * Call an RPC function that bypasses Lovable Cloud type checking
 * Use this when calling functions that exist on self-hosted but not in Lovable Cloud types
 */
export const callRpc = (functionName: string, params?: Record<string, any>): AnyTable => {
  return (supabase.rpc as any)(functionName, params);
};

/**
 * Re-export the original supabase client for operations that work with Lovable Cloud types
 */
export { supabase };
