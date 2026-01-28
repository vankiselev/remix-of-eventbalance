/**
 * Type overrides for self-hosted Supabase schema
 * This file provides type definitions for tables and functions that exist
 * on the self-hosted instance but are not in the Lovable Cloud generated types
 */

import { SupabaseClient } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    // Allow any table name
    from(table: string): any;
    // Allow any RPC function name
    rpc(fn: string, params?: any): any;
  }
}

// Extend the Database type to allow any table
declare global {
  // This tells TypeScript to treat all table operations as any
  type AnySupabaseTable = any;
}
