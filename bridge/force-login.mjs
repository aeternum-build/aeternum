// Force-login — mints an admin magic link for the director, no email delivery involved.
// Uses the same .env as the bridge. Run:
//   node force-login.mjs you@example.com [redirect]
// Open the printed link on the device you want signed in.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

try {
  const envText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {}

const email = process.argv[2];
const redirect = process.argv[3] || 'http://localhost:4173';
if (!email) { console.error('Usage: node force-login.mjs you@example.com [redirect]'); process.exit(1); }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data, error } = await sb.auth.admin.generateLink({
  type: 'magiclink', email, options: { redirectTo: redirect },
});
if (error) { console.error('Could not mint the link — ' + error.message); process.exit(1); }
console.log('\nOpen this on the device to sign in (valid briefly, one use):\n');
console.log(data.properties.action_link);
console.log('\nOr enter this code in an OTP prompt: ' + data.properties.email_otp + '\n');
