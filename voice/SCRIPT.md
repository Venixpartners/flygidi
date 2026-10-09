# FlyGidi conductor voice

The conductor speaks from recorded clips in this folder. Until a clip is recorded, its line shows as text in the game only. The game never falls back to a foreign voice.

## How to record

* One voice for every clip, ideally someone who has actually called routes at a Lagos park. Shout it the way a conductor hangs out of a danfo door: loud, quick, rhythmic.
* Record on a phone in a quiet room, holding it about a hand's length from the mouth.
* One line per file. Trim silence at the start and end. Keep each clip under 2 seconds where you can.
* Save as MP3, mono, 64 to 96 kbps. Small files load fast on mobile data.
* Use the exact file names below, all lowercase.

## How to switch a clip on

1. Put the MP3 in this `voice` folder.
2. Add its name, without `.mp3`, to the `clips` list in `manifest.json`. For example: `"clips": ["next_stop", "stop_maryland"]`.
3. Push to `main`. Lines play as soon as every clip they need is listed.

## General lines (5 clips)

| File | Say this |
|---|---|
| `next_stop.mp3` | "Next bus stop..." (it plays just before a stop name) |
| `missed_1.mp3` | "Driver! You don pass my stop!" (passenger voice, annoyed) |
| `missed_2.mp3` | "Owa! Owa! Driver, you no hear?" (passenger voice) |
| `missed_3.mp3` | "Ah ah! Na here I for come down!" (passenger voice) |
| `oya_enter.mp3` | "Oya, enter! Make we go!" (plays when the conductor is switched on) |

The three passenger lines sound best from a second voice, a woman or an older man, so they are clearly not the conductor.

## Bus stops (43 clips)

Say each name twice, the way conductors call it: "Ojota! Ojota!"

| File | Say this | Route |
|---|---|---|
| `stop_adekunle.mp3` | "Adekunle! Adekunle!" | Third Mainland Bridge |
| `stop_adeniji_adele.mp3` | "Adeniji Adele! Adeniji Adele!" | Third Mainland Bridge |
| `stop_adeniran_ogunsanya.mp3` | "Adeniran Ogunsanya! Adeniran Ogunsanya!" | Surulere |
| `stop_adeola_odeku.mp3` | "Adeola Odeku! Adeola Odeku!" | Victoria Island |
| `stop_aguda.mp3` | "Aguda! Aguda!" | Surulere |
| `stop_ahmadu_bello.mp3` | "Ahmadu Bello! Ahmadu Bello!" | Victoria Island |
| `stop_ajah.mp3` | "Ajah! Ajah!" | Lekki Toll Gate |
| `stop_allen.mp3` | "Allen! Allen!" | Ikeja |
| `stop_awolowo_road.mp3` | "Awolowo Road! Awolowo Road!" | Ikoyi |
| `stop_bar_beach.mp3` | "Bar Beach! Bar Beach!" | Victoria Island |
| `stop_bode_thomas.mp3` | "Bode Thomas! Bode Thomas!" | Surulere |
| `stop_bolade.mp3` | "Bolade! Bolade!" | Oshodi |
| `stop_bourdillon.mp3` | "Bourdillon! Bourdillon!" | Ikoyi |
| `stop_broad_street.mp3` | "Broad Street! Broad Street!" | CMS and Marina |
| `stop_cms.mp3` | "CMS! CMS!" | CMS and Marina |
| `stop_charity.mp3` | "Charity! Charity!" | Oshodi |
| `stop_chevron.mp3` | "Chevron! Chevron!" | Lekki Toll Gate |
| `stop_dolphin.mp3` | "Dolphin! Dolphin!" | Ikoyi |
| `stop_ebute_metta.mp3` | "Ebute Metta! Ebute Metta!" | Third Mainland Bridge |
| `stop_eko_hotel.mp3` | "Eko Hotel! Eko Hotel!" | Victoria Island |
| `stop_falomo.mp3` | "Falomo! Falomo!" | Ikoyi |
| `stop_idumota.mp3` | "Idumota! Idumota!" | CMS and Marina |
| `stop_ikate.mp3` | "Ikate! Ikate!" | Lekki Toll Gate |
| `stop_ikeja_under_bridge.mp3` | "Ikeja Under Bridge! Ikeja Under Bridge!" | Ikeja |
| `stop_ilasamaja.mp3` | "Ilasamaja! Ilasamaja!" | Oshodi |
| `stop_isolo.mp3` | "Isolo! Isolo!" | Oshodi |
| `stop_jakande.mp3` | "Jakande! Jakande!" | Lekki Toll Gate |
| `stop_lekki_phase_1.mp3` | "Lekki Phase 1! Lekki Phase 1!" | Lekki Toll Gate |
| `stop_mafoluku.mp3` | "Mafoluku! Mafoluku!" | Oshodi |
| `stop_marina.mp3` | "Marina! Marina!" | CMS and Marina |
| `stop_maryland.mp3` | "Maryland! Maryland!" | Ikeja |
| `stop_masha.mp3` | "Masha! Masha!" | Surulere |
| `stop_obalende.mp3` | "Obalende! Obalende!" | Third Mainland Bridge, Ikoyi, CMS and Marina |
| `stop_ojota.mp3` | "Ojota! Ojota!" | Ikeja |
| `stop_ojuelegba.mp3` | "Ojuelegba! Ojuelegba!" | Surulere |
| `stop_oniru.mp3` | "Oniru! Oniru!" | Lekki Toll Gate |
| `stop_opebi.mp3` | "Opebi! Opebi!" | Ikeja |
| `stop_oshodi.mp3` | "Oshodi! Oshodi!" | Oshodi |
| `stop_oworonshoki.mp3` | "Oworonshoki! Oworonshoki!" | Third Mainland Bridge |
| `stop_ozumba_mbadiwe.mp3` | "Ozumba Mbadiwe! Ozumba Mbadiwe!" | Victoria Island |
| `stop_stadium.mp3` | "Stadium! Stadium!" | Surulere |
| `stop_tinubu_square.mp3` | "Tinubu Square! Tinubu Square!" | CMS and Marina |
| `stop_toyin.mp3` | "Toyin! Toyin!" | Ikeja |
