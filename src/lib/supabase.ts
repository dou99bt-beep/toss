import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eqborqviqnjlqkmtwtox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYm9ycXZpcW5qbHFrbXR3dG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTQ3NTgsImV4cCI6MjA4OTEzMDc1OH0.z_VDvIy5Hl46r5ncgziuaCtF_bBUNCIoPF6QKbSzHz8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
