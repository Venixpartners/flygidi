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

## Billing switch

Until the aggregator is connected, every signed in player can play. When billing goes live, set the secret `FLYGIDI_BILLING_LIVE` to `true` on the `flygidi-api` function. The game will then need an active row in `flygidi.subscriptions` to start a race. A plan confirmed in the last 48 hours still counts while the phone is offline.

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
