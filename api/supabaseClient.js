import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgzytdvnjnuwbhpvndyn.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Use secure key from Vercel env vars

export const supabase = createClient(supabaseUrl, supabaseKey);
