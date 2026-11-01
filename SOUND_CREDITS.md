# Sound Credits

Processing date: 2026-11-01

## Source and license

- Pack: **UI SFX Set** by **Kenney Vleugels (Kenney.nl)**.
- License: **Creative Commons Zero (CC0), CC0 1.0 Universal**. The included `License.txt` says personal and commercial use are allowed and credit is appreciated but not required.
- License file: `publicsounds-rawui-audio/License.txt`.
- Source folder as received: `publicsounds-rawui-audio/Audio/` (kept outside the commit).
- Pack page: [Kenney UI Audio](https://kenney.nl/assets/ui-audio).
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
- The separate Interface Sounds pack was not present. Every sound below comes from this one CC0 pack.

## Published files

Files are mono OGG/Vorbis. The processing pass trims to signal activity, applies a 20 Hz high-pass filter to reduce DC/very-low-frequency offset, uses an 8 ms edge fade and level limiting. RMS and peak below are measured by decoding the final OGG to mono float PCM with FFmpeg. Peak is sample peak; true peak is **[unverified]**. Every file is under 25 KB; total is **63,472 bytes (61.98 KiB)**.

| ID | Published file | Raw source file | Pack | Author | License | Duration | RMS | Sample peak | Size |
|---|---|---|---|---|---|---:|---:|---:|---:|
| `ui_tick` | `public/sounds/ui_tick.ogg` | `rollover5.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.1059 s | -32.70 dBFS | -13.20 dBFS | 4,538 B |
| `item_completed` | `public/sounds/item_completed.ogg` | `switch18.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.1568 s | -28.12 dBFS | -7.81 dBFS | 4,990 B |
| `item_added` | `public/sounds/item_added.ogg` | `switch28.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0690 s | -29.19 dBFS | -9.80 dBFS | 4,217 B |
| `item_undone` | `public/sounds/item_undone.ogg` | `switch17.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0740 s | -29.35 dBFS | -9.77 dBFS | 4,186 B |
| `item_deleted` | `public/sounds/item_deleted.ogg` | `switch27.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0900 s | -29.23 dBFS | -9.10 dBFS | 4,480 B |
| `grade_saved` | `public/sounds/grade_saved.ogg` | `switch30.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.1299 s | -28.11 dBFS | -8.14 dBFS | 4,812 B |
| `focus_start` | `public/sounds/focus_start.ogg` | `switch24.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.1079 s | -29.82 dBFS | -9.53 dBFS | 4,606 B |
| `focus_pause` | `public/sounds/focus_pause.ogg` | `switch26.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0730 s | -30.15 dBFS | -9.40 dBFS | 4,231 B |
| `focus_resume` | `public/sounds/focus_resume.ogg` | `rollover2.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0376 s | -34.02 dBFS | -13.09 dBFS | 3,955 B |
| `focus_end_alarm` | `public/sounds/focus_end_alarm.ogg` | `switch38.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.2845 s | -31.21 dBFS | -8.36 dBFS | 6,029 B |
| `reminder` | `public/sounds/reminder.ogg` | `switch11.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.1149 s | -30.89 dBFS | -8.45 dBFS | 4,633 B |
| `error` | `public/sounds/error.ogg` | `click1.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0856 s | -31.45 dBFS | -10.39 dBFS | 4,137 B |
| `warning` | `public/sounds/warning.ogg` | `click3.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.0600 s | -35.04 dBFS | -10.45 dBFS | 4,165 B |
| `milestone` | `public/sounds/milestone.ogg` | `switch16.ogg` | UI SFX Set | Kenney Vleugels | CC0 1.0 | 0.1029 s | -28.12 dBFS | -11.38 dBFS | 4,493 B |

## Distribution notes

- `src/utils/audio.ts` lazily fetches and decodes these public files after a user gesture; files stay outside the JavaScript bundle.
- If fetching or decoding fails, the existing per-ID Web Audio synth is used as fallback.
- `public/sw.js` was not changed. Consider runtime-only caching later if offline playback after the first successful cache is needed; the audio files are not added to the install precache.
- Auditory judgment of fatigue, semantic fit and perceived loudness remains **[unverified]**; see `MANUAL_AUDIO_CHECK.md`.
