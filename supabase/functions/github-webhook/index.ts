// The Forge — GitHub org webhook receiver.
// GitHub (org: aeternum-build) POSTs events here; verified events become
// messages in the portal's Forge room. The work reports itself.
//
// Deploy (Supabase dashboard → Edge Functions → New function → paste this), then:
//   - Secrets: GITHUB_WEBHOOK_SECRET (any long random string)
//   - GitHub org → Settings → Webhooks → Add:
//       Payload URL: https://<project-ref>.supabase.co/functions/v1/github-webhook
//       Content type: application/json
//       Secret: the same GITHUB_WEBHOOK_SECRET
//       Events: Pushes, Pull requests, Issues, Releases
//   - In Supabase function settings: disable "Verify JWT" (GitHub cannot send one;
//     authenticity is enforced by the HMAC signature instead).

import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function verify(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('GITHUB_WEBHOOK_SECRET');
  if (!secret) return false;
  const sig = req.headers.get('x-hub-signature-256') || '';
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expect = 'sha256=' + [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sig.length === expect.length && sig === expect;
}

// deno-lint-ignore no-explicit-any
function describe(event: string, p: any): string | null {
  const repo = p.repository?.name ?? 'unknown';
  const who = '@' + (p.sender?.login ?? 'someone');
  switch (event) {
    case 'push': {
      if (!p.commits?.length) return null;
      const branch = (p.ref || '').replace('refs/heads/', '');
      const head = p.head_commit?.message?.split('\n')[0] ?? '';
      return who + ' pushed ' + p.commits.length + ' commit' + (p.commits.length > 1 ? 's' : '') +
        ' to ' + repo + '/' + branch + ' — "' + head + '"';
    }
    case 'pull_request': {
      if (!['opened', 'closed', 'reopened'].includes(p.action)) return null;
      const verb = p.action === 'closed' ? (p.pull_request?.merged ? 'merged' : 'closed') : p.action;
      return who + ' ' + verb + ' PR #' + p.number + ' on ' + repo + ' — "' + p.pull_request?.title + '"';
    }
    case 'issues': {
      if (!['opened', 'closed', 'reopened'].includes(p.action)) return null;
      return who + ' ' + p.action + ' issue #' + p.issue?.number + ' on ' + repo + ' — "' + p.issue?.title + '"';
    }
    case 'release': {
      if (p.action !== 'published') return null;
      return who + ' published ' + repo + ' ' + (p.release?.tag_name ?? '') +
        (p.release?.name ? ' — "' + p.release.name + '"' : '');
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('the forge is lit', { status: 200 });
  const body = await req.text();
  if (!(await verify(req, body))) return new Response('bad signature', { status: 401 });

  const event = req.headers.get('x-github-event') || '';
  if (event === 'ping') return new Response('pong', { status: 200 });

  const text = describe(event, JSON.parse(body));
  if (!text) return new Response('ignored', { status: 200 });

  const { data: room } = await sb.from('rooms').select('id').eq('kind', 'forge').single();
  if (!room) return new Response('no forge room', { status: 500 });

  const { error } = await sb.from('messages').insert({
    room_id: room.id,
    user_id: '00000000-0000-0000-0000-0000000f043e',
    handle: '@forge', role: 'system',
    text: text.slice(0, 2000),
  });
  return error
    ? new Response(error.message, { status: 500 })
    : new Response('posted', { status: 200 });
});
