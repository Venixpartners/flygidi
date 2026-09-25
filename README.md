# FlyGidi Games

Race. Fly. Rank.

FlyGidi is an HTML5 racing game set on the roads of Lagos, offered as a subscription value added service on shortcode 7996. It is a Venix Partners Limited product.

Fly Points are for leaderboard ranking only. They have no monetary value and cannot be redeemed, exchanged or transferred for cash, airtime, data or any other reward.

## What is in this repository

The game is a single self contained page, `index.html`, with no build step. It runs in any modern mobile or desktop browser.

- Eight routes: Third Mainland Bridge, Surulere, Lekki Toll Gate, Ikoyi, Ikeja, Victoria Island, CMS and Marina, and Oshodi
- Three levels: Novice, Pro and Expert
- Five vehicles: Danfo, Keke, Powerbike, SUV and Sports Car
- Personal bests are stored on the player's device for now

## Roadmap

1. Game prototype and routes (done)
2. Backend on Supabase: phone number sign in, server checked scores, leaderboards per route and level
3. Portal pages, subscription access checks and admin dashboard
4. Aggregator integration for opt in, renewal and opt out on 7996

## Deployment

The repository is linked to Vercel. Every push to `main` deploys automatically.

The "unlock all routes" link on the menu is for testing only and will be removed before launch.
