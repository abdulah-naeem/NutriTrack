import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// 1. Load .env manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    const val = trimmed.substring(firstEq + 1).trim();
    process.env[key] = val;
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing connection to Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is missing from .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  try {
    console.log('\nSending test request (fetching current session)...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase Auth returned an error:', error.message);
    } else {
      console.log('✅ Supabase Auth connection SUCCESSFUL!');
      console.log('Session data:', data);
    }

    console.log('\nTesting database query on "profiles" table...');
    const { data: dbData, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (dbError) {
      console.error('❌ Database query failed:', dbError.message);
      if (dbError.hint) console.log('Hint:', dbError.hint);
    } else {
      console.log('✅ Database query SUCCESSFUL! Got data:', dbData);
    }
  } catch (err) {
    console.error('❌ Connection crashed with error:', err.message);
  }
}

runTest();
