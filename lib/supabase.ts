
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pxmeoibtuhaxwoywbpyo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ce6oABzdZ0fuoRDIkq9peA_o8QjSXX1';

export const supabase = createClient(supabaseUrl, supabaseKey);
