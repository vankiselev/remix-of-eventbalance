import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Хардкод для self-hosted Supabase - НЕ МЕНЯТЬ!
const SUPABASE_URL = 'https://superbag.eventbalance.ru/a73e88c7ef6a2ca735abc52404257a9f';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE3OTk1MzU2MDB9.-U5d7p4rwb1fDPQ46dBtyJ1kb8io-dIftC8dMVGi6dw';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
