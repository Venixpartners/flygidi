# FlyGidi Games

Race. Fly. Rank.

FlyGidi is an HTML5 racing game set on the roads of Lagos, offered as a subscription value added service on shortcode 7996. It is a Venix Partners Limited product.

Fly Points are for leaderboard ranking only. They have no monetary value and cannot be redeemed, exchanged or transferred for cash, airtime, data or any other reward.

## What is in this repository

The game is a single self contained page, `index.html`, with no build step. It runs in any modern mobile or desktop browser, on iPhone and Android, in portrait or landscape.

- Eight routes: Third Mainland Bridge, Surulere, Lekki Toll Gate, Ikoyi, Ikeja, Victoria Island, CMS and Marina, and Oshodi
- Three levels: Novice, Pro and Expert
- Five vehicles: Danfo, Keke, Powerbike, SUV and Sports Car, each in seven colours
- Sound generated in the browser, with fixes for iPhone and Android audio rules
- Terms of Service and Privacy Policy in the menu footer
- Personal bests are stored on the player's device for now

## Backend

Supabase project Venix Platform (formerly ejiji, project ID `rjllbjnriawxavkpskkv`), schema `flygidi`: players, sessions, run tickets, runs, badges, weekly champions, live presence, subscriptions and billing events. The tables are closed to the public API; only the game server reads or writes them.

The game server is the edge function `flygidi-api`, kept in `supabase/functions/flygidi-api`. It handles sign in, race tickets, score checks, the Today, Week and All time boards for every route and level, weekly champions and the hall of fame, badges and titles, and the daily streak. Each race gets a ticket when it starts, and the server rejects any score that is faster, longer or higher than the race could physically produce. Rejected scores are kept, flagged with a reason, and left off the boards.

Leaderboards show usernames only. Phone numbers are never shown to other players.

## App and offline play

FlyGidi installs to the home screen from the browser (`manifest.webmanifest`, `sw.js`, `icons/`) and opens full screen. After the first visit it loads with no connection. A race finished offline is saved on the phone and posts to the boards when the connection returns, within three days. Phones with little memory, few cores or data saver on start in a light mode that draws at standard resolution with lighter effects, and any phone drops to it automatically if frames run slow.

## Free day and payment popup

Signing in is free and needs no payment. Racing needs a sign in (phone number and username). Every player gets 24 hours of racing from their first sign in, once per player, recorded as a `trial` row in `flygidi.subscriptions`. After that, starting a race needs an active paid row (`daily`, `weekly` or `monthly`). Until there is one, the game shows the payment popup every time the player opens the game or tries to race, with the three plans and a button that opens the phone's messages with the keyword ready for 7996.

The server makes the final call: `start` refuses a race with status 402 when there is no active plan, and the game stops and shows the popup. A paid plan confirmed in the last 48 hours still counts while the phone is offline. An ended free day does not.

To let a tester keep racing, add a row in the Supabase SQL editor, for example:

```sql
insert into flygidi.subscriptions (player_id, plan, status, price_kobo, starts_at, ends_at)
select id, 'weekly', 'active', 0, now(), now() + interval '7 days' from flygidi.players where display_name = 'GidiTester';
```

To switch the payment popup off for everyone (testing only), set the secret `FLYGIDI_PAYWALL` to `off` on the `flygidi-api` function. The older `FLYGIDI_BILLING_LIVE` secret is no longer read.

Until the updated `flygidi-api` is deployed, the game counts the free day on the phone itself, from the first time the player is seen on that phone. Clearing the phone's site data resets that count, so deploy the server change before launch.

## Tuning difficulty

Every race records how it ended (the obstacle hit, or `quit`) and how far it got. The view `flygidi.run_end_summary` shows, for each route and level over the last 30 days, the number of races, the median and lower quartile distance, the share ending before 300 m and the most common endings. Open it from the Supabase SQL editor with `select * from flygidi.run_end_summary;`.

## Roadmap

1. Game prototype and routes (done)
2. Backend on Supabase: phone number sign in, server checked scores, leaderboards per route and level (done)
3. Garage, installable app, offline play and subscription access checks (done)
4. Aggregator integration for opt in, renewal and opt out on 7996

## Deployment

The repository is linked to Vercel. Every push to `main` deploys automatically.

The "unlock all routes" link on the menu is for testing only and will be removed before launch.
