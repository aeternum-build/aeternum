// The Bridge — connects the director's private portal room to Claude Code.
//
// Watches the room for the director's messages, feeds each one to headless
// Claude Code (`claude -p --continue`, running under YOUR login, in the
// aeternum repo so it can read, edit, and advise), and posts the reply back
// into the room as @claude.
//
// Runs on any always-on machine of yours (this PC, later the Mac mini).
// Uses the Supabase SERVICE key — that key never leaves this machine and
// must never be committed or placed in the site.
//
//   node --env-file=.env claude-bridge.mjs
//
// .env (see .env.example):
//   SUPABASE_URL=...        SUPABASE_SERVICE_KEY=...
//   AETERNUM_REPO=C:\Users\marce\Documents\aeternum
//   BRIDGE_ROOM=The Bridge

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// self-load .env (works on any Node version)
try {
  const envText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* no .env — rely on real environment */ }

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, AETERNUM_REPO, BRIDGE_ROOM = 'The Bridge' } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { realtime: { transport: ws } });
const CLAUDE_ID = '00000000-0000-0000-0000-00000000c1a0'; // synthetic seat for the resident intelligence
const POLL_MS = 5000;
const MAX_LEN = 2000; // messages.text check constraint

let roomId = null;
let lastTs = new Date().toISOString();
let busy = false;

async function findRoom() {
  const { data, error } = await sb.from('rooms').select('id').eq('name', BRIDGE_ROOM).single();
  if (error || !data) { console.error('Room "' + BRIDGE_ROOM + '" not found — create it first.'); process.exit(1); }
  roomId = data.id;
  console.log('Bridge open on room "' + BRIDGE_ROOM + '" (' + roomId + '). Watching…');
}

function runClaude(prompt) {
  return new Promise((resolve) => {
    // the prompt travels via stdin: immune to Windows shell re-parsing/quoting
    const p = spawn('claude', ['-p', '--continue'], {
      cwd: AETERNUM_REPO || process.cwd(),
      shell: true,           // resolves claude.cmd on Windows
    });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve(code === 0 && out.trim() ? out.trim() : ('The bridge stuttered (exit ' + code + '): ' + (err || out || 'no output').trim().slice(0, 500))));
    p.stdin.write(prompt);
    p.stdin.end();
  });
}

async function post(text) {
  // long replies arrive as a sequence of messages, respecting the 2000-char rule
  for (let i = 0; i < text.length; i += MAX_LEN) {
    await sb.from('messages').insert({
      room_id: roomId, user_id: CLAUDE_ID,
      handle: '@claude', role: 'claude',
      text: text.slice(i, i + MAX_LEN),
    });
  }
}

async function poll() {
  if (busy || !roomId) return;
  const { data, error } = await sb.from('messages')
    .select('*').eq('room_id', roomId).gt('created_at', lastTs)
    .order('created_at', { ascending: true });
  if (error || !data || !data.length) return;
  for (const m of data) {
    lastTs = m.created_at;
    if (m.handle === '@claude' || m.deleted) continue;
    busy = true;
    console.log('[' + m.created_at + '] ' + m.handle + ': ' + m.text.slice(0, 80));
    const reply = await runClaude(m.text);
    await post(reply);
    console.log('  ↳ replied (' + reply.length + ' chars)');
    busy = false;
  }
}

await findRoom();
setInterval(poll, POLL_MS);
poll();
