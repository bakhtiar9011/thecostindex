import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgzytdvnjnuwbhpvndyn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use secure key from Vercel env vars

export const supabase = createClient(supabaseUrl, supabaseKey);
