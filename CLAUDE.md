# The Aeternum site

By redpropriety and Claude

Status: live in production at aeternum.build

Aeternum is a collective of builders and creators. This site is its gateway: it presents the collective, receives applications for membership, and houses the members' portal. Everything below is law for any Claude working on it. Read this before changing anything.


## The one law

The site is one file. index.html carries every page, every style and every behaviour. Do not split it, do not add a framework, do not add a build step.

## What the site is

The home page is an orbital ring. Six satellites orbit the Aeternum wordmark: Who We Are, Our Mission, Apply, Completed Projects, Inbound Projects, Portal. Clicking a satellite zooms into it. Satellites with orbitals become their own ring, with the parent ring overhead as the way back. The arc overhead always climbs one level. This recursion is the site's identity.

The Apply satellite holds a two stage application form. Stage one is identity and history, ending at email verification by one time code. Stage two unveils two written sections, then the submit button. Applications land in the Supabase applications table and are read in the dashboard only.

The Portal satellite is the members' quarter, gated by membership login. Inside is a near fullscreen workspace shaped like a messaging dashboard: a rail on the left (News, All Chat, BoardRoom, The Forge, Custom Chats with Create inside it, Org Chart) and the conversation on the right. Sent messages sit right, received sit left. Rank badges are orbital glyphs: a member is a point of light, an executive gains a ring, the director carries the crossed rings in plum, Claude carries them in ember.

## The theme (never deviate)

Colours: cream #f6e7c9 for text and rings, sunrise #e8894a and ember #b4512e for glow and accents, plum #2b1020 and #3d1524 for surfaces, hard black for depth. The home background falls from black through plum into a sunset band. Page levels darken as you descend: home keeps the sunset, satellite pages polarise to black and plum, third level fades to pure black. Orange never appears on inner pages.

Fonts: Playfair Display italic 600 for titles and wordmarks, Georgia for everything else. Uppercase with wide letter spacing for labels and navigation.

Motion: the two home rings sway their lean in opposition and periodically cross into a figure eight. Arrival is a fall: the ring starts small and spinning, grows, settles, and only then may its title fade in (at 80 percent landed). Background drifters are small crossed ellipse emblems floating rightward, swaying the same figure eight, dissolving before they reach the sunset band. The ring obeys the law of the hand: the front of the ring follows the gesture, on drag and on scroll, on every ring.

The emblem is the crossed ellipse pair, everywhere: the logo (an A held by the rings, assets/logo.svg), the rank badges, the drifters, the Coming Soon card.

## The director's taste (hard rules)

No hyphens or dashes as separators in visible copy. No middle dots. No bullet points anywhere on the site: write prose sentences, or lines shaped as "Label: sentence".

Symmetry and boldness over decoration: rows in a component share one font size, one weight, one height. No mixed sizes inside a rail or list.

Empty content is never an apology. Anything with nothing to show wears the gold stamp Coming Soon card.

Instructional chrome is temporary or absent: the arrival hint appears once, fades, and never returns. The site should explain itself by moving.

## Writing style for documents and chat

The director writes plainly: ## headings, short declarative sentences, definitions as "Term: meaning" lines, a closing "Put simply:" where a summary helps. Match it. In chat, keep answers to a few sentences per point. Bullet lists are acceptable in chat, never on the site.

## The stack

The page is static, hosted on Netlify from github.com/aeternum-build/aeternum. Branch dev is staging (Netlify branch deploy), main deploys to production on push. Prod ships only on the director's explicit word. Routes are clean paths via the History API; _redirects gives Netlify the SPA fallback; legacy #/ links convert on arrival.

Supabase (project yufnclufemzecyenxouz) is the entire backend: auth by email one time code (codes are 8 digits, inputs accept 6 to 10), tables members, rooms, room_members, messages, news_items, applications. Security lives in RLS, not the interface: the director reads all rooms, members read where seated, the Forge accepts no member writes. The publishable key belongs in the page. Service keys and AI keys never enter the repo or the page.

The Forge: supabase/functions/github-webhook (deployed under the slug clever-api) receives GitHub org webhooks, verifies the HMAC signature, and posts events into the read only Forge room as @forge. No local machine involved.

The Bridge: bridge/claude-bridge.mjs runs on the director's machine only, under the director's Max login, watching the room named Claude and answering through headless Claude Code. Its .env holds the service key and is git ignored.

## Put simply

One file, one theme, one emblem. Rings that obey the hand, titles that wait for their ring, plum and cream and ember on black. No dashes, no dots, no bullets on the site. dev to try, main to ship, and only the director says ship.
