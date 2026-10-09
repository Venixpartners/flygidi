// FlyGidi game server: sign in, run tickets, score checks, leaderboards, champions, badges.
// Talks to the flygidi schema directly; the tables are closed to the public API.
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (msg: string, status = 400) => json({ ok: false, error: msg }, status);

// ---------- game constants, kept in step with index.html ----------
const LEVELS: Record<string, number> = { novice: 560, pro: 760, expert: 900 }; // top speed, px per second
const ROUTES: Record<string, number> = { tmb: 1.0, surulere: 1.02, lekki: 1.05, ikoyi: 1.06, ikeja: 1.08, vi: 1.1, cms: 1.1, oshodi: 1.15 };
const VEHICLES: Record<string, { speed: number; seats: number }> = {
  danfo: { speed: 1, seats: 14 }, keke: { speed: 1, seats: 3 }, powerbike: { speed: 1, seats: 1 },
  suv: { speed: 1, seats: 6 }, sportcar: { speed: 1.1, seats: 2 },
};
const MULTS = [1, 1.5, 2, 2.5, 3];

const BADGES = [
  { id: "first_run", title: "Fresh Driver", desc: "Finish your first race" },
  { id: "pax50", title: "Conductor's Friend", desc: "Carry 50 passengers" },
  { id: "pax500", title: "Molue Master", desc: "Carry 500 passengers" },
  { id: "near100", title: "Close Shave", desc: "Make 100 close calls" },
  { id: "km100", title: "Road Warrior", desc: "Drive 100 km in total" },
  { id: "routes8", title: "Lagos Explorer", desc: "Race on all 8 routes" },
  { id: "expert10k", title: "Expert Gidi", desc: "Score 10,000 in one Expert race" },
  { id: "streak7", title: "Faithful Driver", desc: "Reach a 7 day streak" },
  { id: "streak30", title: "Eko Regular", desc: "Reach a 30 day streak" },
  { id: "champion", title: "Route Champion", desc: "Top a route board for a week" },
  { id: "legend", title: "Lagos Legend", desc: "Be weekly champion 3 times" },
];
const badgeTitle = (id: string | null) => BADGES.find((b) => b.id === id)?.title ?? null;

// ---------- helpers ----------
async function sha256(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newToken() {
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]!));
}
function normPhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[789]\d{9}$/.test(d) ? "+234" + d : null;
}
function cleanName(raw: unknown): string | null {
  const n = String(raw ?? "").trim().replace(/\s+/g, " ");
  return /^[A-Za-z0-9 ._]{2,24}$/.test(n) ? n : null;
}
const ymd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const int = (v: unknown, max = 10_000_000) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const lagosToday = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

async function playerFromToken(token: unknown) {
  if (typeof token !== "string" || token.length < 20) return null;
  const h = await sha256(token);
  const rows = await sql`
    update flygidi.sessions s set last_used_at = now() from flygidi.players p
    where s.token_hash = ${h} and p.id = s.player_id
    returning p.id, p.display_name, p.title, p.streak_count, p.streak_last, p.streak_best, p.totals`;
  return rows[0] ?? null;
}

// ---------- weekly champions, settled lazily for any finished week ----------
async function settleChampions() {
  const rows = await sql`
    with weeks as (
      select (date_trunc('week', now() at time zone 'Africa/Lagos') - interval '7 days')::date as ws
    ), best as (
      select distinct on (r.route, r.level) w.ws, r.route, r.level, r.player_id, r.score
      from flygidi.runs r, weeks w
      where not r.flagged
        and r.created_at >= (w.ws::timestamp at time zone 'Africa/Lagos')
        and r.created_at <  ((w.ws + 7)::timestamp at time zone 'Africa/Lagos')
      order by r.route, r.level, r.score desc, r.created_at
    )
    insert into flygidi.champions (week_start, route, level, player_id, score)
    select ws, route, level, player_id, score from best
    on conflict do nothing
    returning player_id`;
  for (const r of rows) {
    const [{ n }] = await sql`select count(*)::int n from flygidi.champions where player_id = ${r.player_id}`;
    await sql`insert into flygidi.badges_earned (player_id, badge) values (${r.player_id}, 'champion') on conflict do nothing`;
    if (n >= 3) await sql`insert into flygidi.badges_earned (player_id, badge) values (${r.player_id}, 'legend') on conflict do nothing`;
  }
}

// Access to play. Until billing goes live at aggregator integration, every signed in player has access.
// Set FLYGIDI_BILLING_LIVE=true on this function to require an active 7996 subscription.
const BILLING_LIVE = Deno.env.get("FLYGIDI_BILLING_LIVE") === "true";
async function accessOf(p: any) {
  if (!BILLING_LIVE) return { active: true, billing: false, until: null };
  const s = await sql`select plan, ends_at from flygidi.subscriptions where player_id = ${p.id} and status = 'active' and ends_at > now() order by ends_at desc limit 1`;
  return { active: s.length > 0, billing: true, plan: s[0]?.plan ?? null, until: s[0]?.ends_at ?? null };
}

async function profileOf(p: any) {
  const badges = await sql`select badge, earned_at from flygidi.badges_earned where player_id = ${p.id} order by earned_at`;
  const [{ wins }] = await sql`select count(*)::int wins from flygidi.champions where player_id = ${p.id}`;
  return {
    name: p.display_name,
    title: badgeTitle(p.title),
    titleId: p.title,
    streak: { count: p.streak_count, last: ymd(p.streak_last), best: p.streak_best },
    totals: p.totals ?? {},
    wins,
    badges: BADGES.map((b) => ({ ...b, earned: badges.some((e: any) => e.badge === b.id) })),
    access: await accessOf(p),
  };
}

// ---------- score check ----------
// Every limit is generous for honest play and impossible to beat by editing the numbers sent.
function checkRun(t: any, r: any, elapsedS: number): string | null {
  const veh = VEHICLES[t.vehicle];
  const maxMps = (LEVELS[t.level] * ROUTES[t.route] * veh.speed) / 10; // game metres per second
  const playS = r.duration_ms / 1000;
  if (playS > elapsedS + 5) return "race longer than the time since it started";
  if (r.meters > Math.min(elapsedS, playS + 2) * maxMps * 1.05 + 30) return "distance faster than the top speed";
  if (r.stops > r.meters / 120 + 2) return "more bus stops than the road allows";
  if (r.pax > r.stops * veh.seats) return "more passengers than the seats allow";
  if (r.passed > r.meters / 3 + 10) return "more vehicles passed than the road allows";
  if (r.near > r.passed + r.meters / 50 + 5) return "more close calls than vehicles passed";
  if (r.hops > Math.min(r.meters / 15, playS / 2.2) + 2) return "more hops than the cooldown allows";
  if (r.combo < 1 || r.combo > 5) return "combo out of range";
  if (!MULTS.includes(r.mult)) return "multiplier out of range";
  const M = 5 * r.mult * 1.5; // best combo, mission rank and the FAST bonus together
  const ceiling = M * (0.44 * r.meters + 10 * r.passed + 15 * r.near + 15 * r.hops + 56 * r.pax + 0.6 * r.meters) * 1.1 + 50;
  if (r.score > ceiling) return "score above what this race could earn";
  return null;
}

// ---------- actions ----------
async function signIn(body: any) {
  const phone = normPhone(body.phone), name = cleanName(body.name);
  if (!phone) return fail("Enter a Nigerian phone number, like 0803 123 4567.");
  if (!name) return fail("Username must be 2 to 24 letters or numbers.");
  const existing = await sql`select id, display_name from flygidi.players where msisdn = ${phone}`;
  let id: string;
  if (existing.length) {
    if (existing[0].display_name.toLowerCase() !== name.toLowerCase())
      return fail("This number is already registered with a different username.");
    id = existing[0].id;
  } else {
    const taken = await sql`select 1 from flygidi.players where lower(display_name) = lower(${name})`;
    if (taken.length) return fail("That username is taken. Try another one.");
    try {
      const ins = await sql`insert into flygidi.players (msisdn, display_name, last_seen_at) values (${phone}, ${name}, now()) returning id`;
      id = ins[0].id;
    } catch (e: any) {
      // two people claiming the same name or number at the same moment
      if (e?.code === "23505") return fail("That username or number was just taken. Try again.");
      throw e;
    }
  }
  const token = newToken();
  await sql`insert into flygidi.sessions (token_hash, player_id) values (${await sha256(token)}, ${id})`;
  await sql`update flygidi.players set last_seen_at = now() where id = ${id}`;
  const p = (await sql`select id, display_name, title, streak_count, streak_last, streak_best, totals from flygidi.players where id = ${id}`)[0];
  return json({ ok: true, token, profile: await profileOf(p) });
}

async function startRun(p: any, body: any) {
  if (!LEVELS[body.level] || ROUTES[body.route] === undefined || !VEHICLES[body.vehicle]) return fail("Unknown route, level or vehicle.");
  // close any ticket left open by a race that never posted
  await sql`update flygidi.run_tickets set used_at = now() where player_id = ${p.id} and used_at is null`;
  const t = await sql`insert into flygidi.run_tickets (player_id, route, level, vehicle) values (${p.id}, ${body.route}, ${body.level}, ${body.vehicle}) returning id`;
  return json({ ok: true, ticket: t[0].id });
}

async function submitRun(p: any, body: any) {
  const ticketId = String(body.ticket ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return fail("Missing race ticket.");
  const tk = await sql`
    update flygidi.run_tickets set used_at = now()
    where id = ${ticketId} and player_id = ${p.id} and used_at is null and issued_at > now() - interval '3 hours'
    returning route, level, vehicle, extract(epoch from (now() - issued_at)) as elapsed`;
  if (!tk.length) return fail("This race was already posted or has expired.");
  return await finishRun(p, tk[0], body, ticketId, Number(tk[0].elapsed), false);
}

// a race played without a connection, posted when the phone is back online
async function submitOffline(p: any, body: any) {
  const oid = String(body.oid ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(oid)) return fail("Missing race id.");
  if (!LEVELS[body.level] || ROUTES[body.route] === undefined || !VEHICLES[body.vehicle]) return fail("Unknown route, level or vehicle.");
  const playedAt = Number(body.played_at);
  const age = Date.now() - playedAt;
  if (!Number.isFinite(playedAt) || age < -5 * 60_000 || age > 72 * 3_600_000) return fail("Races played offline must be posted within 3 days.");
  // the client's race id doubles as a used ticket, so the same race can never post twice
  const ins = await sql`
    insert into flygidi.run_tickets (id, player_id, route, level, vehicle, issued_at, used_at)
    values (${oid}, ${p.id}, ${body.route}, ${body.level}, ${body.vehicle}, to_timestamp(${playedAt / 1000}), now())
    on conflict (id) do nothing returning id`;
  if (!ins.length) return json({ ok: true, accepted: false, duplicate: true });
  const t = { route: body.route, level: body.level, vehicle: body.vehicle };
  // no server clock for an offline race, so the play time stands in for it; every other check still applies
  return await finishRun(p, t, body, oid, int(body.duration_ms, 86_400_000) / 1000 + 5, true, new Date(playedAt));
}

async function finishRun(p: any, t: any, body: any, ticketId: string, elapsed: number, offline: boolean, playedAt: Date | null = null) {
  const r = {
    score: int(body.score), meters: int(body.meters), passed: int(body.passed), pax: int(body.pax),
    near: int(body.near), stops: int(body.stops), hops: int(body.hops), combo: int(body.combo, 9),
    mult: Math.round((Number(body.mult) || 1) * 10) / 10, rank: int(body.rank, 9), duration_ms: int(body.duration_ms, 86_400_000),
  };
  const reason = checkRun(t, r, elapsed);
  const end = typeof body.end === "string" ? body.end.slice(0, 24) : null;
  await sql`
    insert into flygidi.runs (player_id, route, level, vehicle, color, score, distance_m, passed, duration_ms, client_version, flagged, flag_reason,
      ticket_id, passengers, near_misses, stops, hops, best_combo, multiplier, mission_rank, end_reason, offline, played_at)
    values (${p.id}, ${t.route}, ${t.level}, ${t.vehicle}, ${String(body.color ?? "").slice(0, 16) || null}, ${r.score}, ${r.meters}, ${r.passed}, ${r.duration_ms},
      ${String(body.v ?? "").slice(0, 16) || null}, ${reason !== null}, ${reason}, ${ticketId}, ${r.pax}, ${r.near}, ${r.stops}, ${r.hops}, ${r.combo}, ${r.mult}, ${r.rank}, ${end}, ${offline}, ${playedAt})`;
  if (reason) return json({ ok: true, accepted: false, reason });

  // totals, streak and badges for accepted races
  const tot = { runs: 0, meters: 0, pax: 0, near: 0, routes: [] as string[], ...(p.totals ?? {}) };
  tot.runs += 1; tot.meters += r.meters; tot.pax += r.pax; tot.near += r.near;
  if (!tot.routes.includes(t.route)) tot.routes.push(t.route);
  let { streak_count: sc, streak_last: sl, streak_best: sb } = p;
  const today = lagosToday(playedAt ?? new Date());
  const last = ymd(sl);
  // an offline race posted late can only extend the streak forward, never rewrite it
  if (r.meters >= 100 && last !== today && (!last || today > last)) {
    const gap = last ? Math.round((Date.parse(today) - Date.parse(last)) / 86_400_000) : 99;
    sc = gap === 1 ? sc + 1 : 1; sb = Math.max(sb, sc); sl = today;
  }
  await sql`update flygidi.players set totals = ${sql.json(tot)}, streak_count = ${sc}, streak_last = ${sl}, streak_best = ${sb}, last_seen_at = now() where id = ${p.id}`;

  const earn: string[] = ["first_run"];
  if (tot.pax >= 50) earn.push("pax50");
  if (tot.pax >= 500) earn.push("pax500");
  if (tot.near >= 100) earn.push("near100");
  if (tot.meters >= 100_000) earn.push("km100");
  if (tot.routes.length >= 8) earn.push("routes8");
  if (t.level === "expert" && r.score >= 10_000) earn.push("expert10k");
  if (sb >= 7) earn.push("streak7");
  if (sb >= 30) earn.push("streak30");
  const fresh = await sql`
    insert into flygidi.badges_earned (player_id, badge) select ${p.id}, unnest(${earn}::text[])
    on conflict do nothing returning badge`;
  if (fresh.length && !p.title) await sql`update flygidi.players set title = ${fresh[fresh.length - 1].badge} where id = ${p.id}`;

  // where this race places today and on the player's best for the week
  const [{ day_rank }] = await sql`
    select 1 + count(*)::int as day_rank from (
      select distinct on (player_id) player_id, score from flygidi.runs
      where route = ${t.route} and level = ${t.level} and not flagged
        and created_at >= (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')
      order by player_id, score desc) b
    where b.score > ${r.score}`;
  return json({
    ok: true, accepted: true, dayRank: day_rank,
    streak: { count: sc, last: ymd(sl), best: sb },
    newBadges: fresh.map((f: any) => BADGES.find((b) => b.id === f.badge)).filter(Boolean),
  });
}

async function board(p: any, body: any) {
  const route = String(body.route), level = String(body.level), period = String(body.period ?? "day");
  if (ROUTES[route] === undefined || !LEVELS[level]) return fail("Unknown route or level.");
  const since = period === "all" ? sql`'-infinity'::timestamptz`
    : period === "week" ? sql`(date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')`
    : sql`(date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')`;
  const rows = await sql`
    with best as (
      select distinct on (r.player_id) r.player_id, r.score, r.vehicle, r.created_at
      from flygidi.runs r
      where r.route = ${route} and r.level = ${level} and not r.flagged and r.created_at >= ${since}
      order by r.player_id, r.score desc, r.created_at
    ), ranked as (
      select b.*, rank() over (order by b.score desc, b.created_at) as pos from best b
    )
    select k.pos::int, k.score, k.vehicle, k.player_id, pl.display_name, pl.title
    from ranked k join flygidi.players pl on pl.id = k.player_id
    where k.pos <= 50 or k.player_id = ${p ? p.id : null}
    order by k.pos`;
  const out = rows.map((x: any) => ({ pos: x.pos, name: x.display_name, title: badgeTitle(x.title), score: x.score, vehicle: x.vehicle, me: !!p && x.player_id === p.id }));
  return json({ ok: true, rows: out.filter((x) => x.pos <= 50), me: out.find((x) => x.me) ?? null });
}

async function champions() {
  await settleChampions();
  const last = await sql`
    select c.route, c.level, c.score, pl.display_name, pl.title from flygidi.champions c join flygidi.players pl on pl.id = c.player_id
    where c.week_start = (select max(week_start) from flygidi.champions) order by c.route, c.level`;
  const hall = await sql`
    select pl.display_name, pl.title, count(*)::int wins, max(c.week_start) last_win
    from flygidi.champions c join flygidi.players pl on pl.id = c.player_id
    group by pl.id order by wins desc, last_win desc limit 30`;
  const [{ ws }] = await sql`select max(week_start)::text ws from flygidi.champions`;
  return json({
    ok: true, week: ws,
    champions: last.map((c: any) => ({ route: c.route, level: c.level, score: c.score, name: c.display_name, title: badgeTitle(c.title) })),
    hall: hall.map((h: any) => ({ name: h.display_name, title: badgeTitle(h.title), wins: h.wins })),
  });
}

// ---------- who is playing right now ----------
// Each open game checks in every two minutes with a random device code. A phone counts as online
// for two and a half minutes after its last check in.
async function ping(body: any) {
  const device = String(body.device ?? "");
  if (!/^[0-9a-f-]{16,64}$/i.test(device)) return fail("Bad device code.");
  const racing = body.racing === true;
  const route = racing && ROUTES[body.route] !== undefined ? String(body.route) : null;
  await sql`
    insert into flygidi.presence (device_id, racing, route, last_seen) values (${device}, ${racing}, ${route}, now())
    on conflict (device_id) do update set racing = excluded.racing, route = excluded.route, last_seen = now()`;
  // now and then, clear out phones not seen for a day
  if (Math.random() < 0.01) await sql`delete from flygidi.presence where last_seen < now() - interval '1 day'`;
  return json({ ok: true, live: await liveCounts() });
}
async function liveCounts() {
  const rows = await sql`
    select route, racing, count(*)::int n from flygidi.presence
    where last_seen > now() - interval '150 seconds' group by route, racing`;
  const routes: Record<string, number> = {};
  let online = 0, racing = 0;
  for (const r of rows) { online += r.n; if (r.racing) { racing += r.n; if (r.route) routes[r.route] = (routes[r.route] ?? 0) + r.n; } }
  return { online, racing, routes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return fail("Use POST.", 405);
  let body: any;
  try { body = await req.json(); } catch { return fail("Bad request."); }
  try {
    const action = String(body.action ?? "");
    if (action === "signin") return await signIn(body);
    if (action === "champions") return await champions();
    if (action === "ping") return await ping(body);
    const p = await playerFromToken(body.token);
    if (action === "board") return await board(p, body);
    if (!p) return fail("Please sign in again.", 401);
    if (action === "me") { await settleChampions(); return json({ ok: true, profile: await profileOf(p) }); }
    if (action === "start") return await startRun(p, body);
    if (action === "submit") return await submitRun(p, body);
    if (action === "submit_offline") return await submitOffline(p, body);
    if (action === "title") {
      const id = String(body.title ?? "");
      const own = await sql`select 1 from flygidi.badges_earned where player_id = ${p.id} and badge = ${id}`;
      if (!own.length) return fail("You have not earned that title yet.");
      await sql`update flygidi.players set title = ${id} where id = ${p.id}`;
      return json({ ok: true });
    }
    if (action === "signout") { await sql`delete from flygidi.sessions where token_hash = ${await sha256(String(body.token))}`; return json({ ok: true }); }
    return fail("Unknown action.");
  } catch (e) {
    console.error(e);
    return fail("Server error. Try again shortly.", 500);
  }
});
