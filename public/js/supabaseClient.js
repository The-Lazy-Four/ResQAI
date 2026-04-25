import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

const url = CONFIG.SUPABASE_URL;
const key = CONFIG.SUPABASE_PUBLISHABLE_KEY || CONFIG.SUPABASE_ANON_KEY;

if (!url || !key || url === 'YOUR_URL' || key === 'YOUR_KEY') {
  console.error('Supabase config missing or invalid. Auth features will not work.');
}

// Create the Supabase client (or null if config is bad)
export const supabase = (url && key) ? createClient(url, key) : null;