# StudyOS interaction and sound map

**Status:** refreshed static source audit, 2026-11-01. This document records call sites and sound policy; runtime counts remain **[unverified]**. No third-party audio files were found or added. The engine now accepts 14 intent IDs, resolves legacy IDs to those intents, and keeps the Web Audio synth as fallback.

## Architecture found

1. The frontend is React + TypeScript built by Vite; `src/main.tsx` mounts the app and `src/App.tsx` owns the main tab and modal composition.
2. `src/utils/audio.ts` exports `CalmAudioEngine`, the singleton `chimePlayer`, `playChime`, and its public sound-id type.
3. The engine currently synthesizes with Web Audio oscillators, filters, noise, and gain envelopes; no generated sound assets are present in `public/sounds/`.
4. The engine has 14 active intent IDs: `ui_tick`, `item_completed`, `item_added`, `item_undone`, `item_deleted`, `grade_saved`, `focus_start`, `focus_pause`, `focus_resume`, `focus_end_alarm`, `reminder`, `error`, `warning`, and `milestone`.
5. Legacy component calls resolve through aliases (for example `complete` → `item_completed`, `focus_finish` → `focus_end_alarm`); generic click, tab, modal, success-toast, and activity calls stay silent.
6. Sound preferences exist as `settings.chimeSoundEnabled` and `settings.soundVolume`, wired by `App.tsx` and exposed in Settings.
7. `Toast.tsx` maps success/warning/error to `toast_success`/`toast_warning`/`toast_error`; info toasts are silent.
8. `notificationService.ts` can issue `notification`; focus end is handled by `FocusModeModal.tsx` and calls `focus_finish`.
9. The source scan found 488 `onClick`/`onChange`/`onSubmit`/drag/pointer/key handler attribute occurrences under `src/`; counts are source matches, not unique controls or runtime calls.
10. Static review covered the 11 `*Tab.tsx` files, `Dashboard`, App, charts, shared UI, notifications, and services. Browser interaction counts remain unverified.

## Decision rules

- Proposed set: 14 distinct IDs, within the requested 10–14 target. Events are grouped by semantic outcome, never by individual button.
- Reward > confirmation > transition > tick; a single action should produce at most one audible cue. A toast should share the action token with its originating sound, allowing the engine to suppress the lower-priority duplicate.
- Completion, grade-save, milestone, focus-end, and reminder cues are proposed as distinct categories. Add/undo/delete use restrained confirmation cues; delete is deliberately quiet and final.
- Very frequent/passive interactions stay silent. `ui_tick` is opt-in only and is not attached globally.
- The “Current sound” column describes the literal call found in source; the alias table below states which calls currently resolve to an audible intent.

## Grouped interaction inventory

Frequency is a design classification from the control's expected role, not measured runtime data. “Current” names the source ID; whether a user actually heard it in a particular browser is **[unverified]**.

| Source location | Component / user-facing action | Event type | Frequency | Source call (legacy IDs resolve below) | Proposed decision / priority | Reason |
|---|---|---|---|---|---|---|
| `src/App.tsx:474,493-524` | App navigation by keyboard or tab selection | navigation | frequent | none | `SILENT` | Navigation is repeated and should not chirp. |
| `src/components/shared/Sidebar.tsx:154` | Sidebar tab switch | navigation | frequent | `tab_switch` (legacy call) | `SILENT` | Avoid fatigue from routine navigation. |
| `src/components/shared/Sidebar.tsx:298,336,353,386,400,414` | Sidebar quick controls, settings, and service actions | navigation/settings | occasional | `click` (legacy call) | `SILENT` | These are ordinary controls; no global click layer. |
| `src/components/shared/TopHeader.tsx:91-264` | Hamburger, database, refresh, focus, notification, shortcuts, quick-add | navigation/open | frequent | `click` on hamburger and notification only (legacy call); other controls none | Modal launch mapped to the modal's outcome; otherwise `SILENT` | Avoid a header click plus modal sound double-fire. |
| `src/App.tsx:530-540` | Sound on/off test toggle | setting / preview | occasional | `click` (legacy call) | `SILENT`; explicit preview may use `ui_tick` | Settings changes stay silent; preview is the only opt-in exception. |
| App + Settings language/theme controls | Language and theme selection | setting | occasional | none | `SILENT` | Explicitly keep preference changes quiet. |
| `src/components/Dashboard.tsx:1151-1193,1221-1245` | Quick task form, fields, preset task buttons, submit | form / add | occasional | `add` on add helper (legacy call) | `item_added` / confirmation | One short sound only after successful save; fields stay silent. |
| `src/components/Dashboard.tsx:1281-1282,1357-1358,1457-1458` | Dashboard row/view controls | selection | frequent | `click` (legacy call) | `SILENT` | Repeated list controls. |
| `src/components/Dashboard.tsx:1324-1328,1594-1598` | Dashboard task complete / undo | completion | occasional | `complete` active; `uncheck` (legacy call) | `item_completed` reward / `item_undone` confirmation | Mutually exclusive branches; undo is quieter. |
| `src/components/Dashboard.tsx:1474-1475` | Dashboard item delete | destructive | occasional | `delete` (legacy call) | `item_deleted` confirmation | One soft, final sound after successful deletion. |
| `src/components/tabs/TasksTab.tsx:77-81,192,201-202` | Complete/undo, expand task row, delete task | completion / row action / destructive | occasional | `complete` active; `uncheck`/`delete` (legacy call) | `item_completed`; `item_undone`; expand `SILENT`; `item_deleted` | Completion is a reward; row expansion has no meaning to sound. |
| `src/components/tabs/TasksTab.tsx:316,341-343,539,605,615,726,771` | Add task, quick completion helper, open/close add UI | add / completion / modal | occasional | `add` (legacy call); `complete` active plus `click` (legacy call) on exclusive branch; modal IDs not used here | `item_added`; `item_completed`; modal `SILENT` | Keep one confirmation on success; no click layered over completion. |
| `src/components/tabs/TasksTab.tsx:223,532-591` | Checklist, search, filters, selectors | toggle / input / filter | frequent | none | `SILENT` | Bulk and navigation-like changes are intentionally quiet. |
| `src/components/tabs/HomeworkTab.tsx:125,177-182,195,202-203` | Checklist, complete/undo homework, edit, delete | completion / edit / destructive | occasional | `complete` active; `uncheck`/`delete` (legacy call) | `item_completed`; `item_undone`; edit `SILENT`; `item_deleted` | Edit stays quiet; mutually exclusive completion outcomes. |
| `src/components/tabs/HomeworkTab.tsx:244,259,301,318,342-344,400,511,665` | Open/add/edit/close homework form, submit, quick completion | modal / add / completion | occasional | `modal_open`/`modal_close`/`add` (legacy call); `complete` active and branch `click` (legacy call) | `item_added`; `item_completed`; modal `SILENT` | Use a cue after a successful mutation only. |
| `src/components/tabs/HomeworkTab.tsx:400-466,530-654` | Search, subject/status/priority filters, fields | input / selection | frequent | none | `SILENT` | Avoid repeated low-value sounds. |
| `src/components/tabs/GoalsTab.tsx:39,47,49,70,123,144,170,177,195` | Add, complete/undo, delete goal; add/edit modal submit/close | add / completion / destructive / modal | occasional | `add`/`uncheck`/`delete` (legacy call); `complete` active | `item_added`; `item_completed`; `item_undone`; `item_deleted`; modal `SILENT` | One cue per successful action. |
| `src/components/tabs/HabitsTab.tsx:63,74,76,119-159,228,238,269,288,295,319,334` | Add habit, daily complete/undo, delete, view tabs, icon choices, form/modal | add / completion / destructive / selection | occasional; daily toggle frequent | `add`/`uncheck`/`delete` (legacy call); `complete` active | `item_added`; `item_completed`; `item_undone`; `item_deleted`; view/modal/icon `SILENT` | Keep the repeated daily action calm; only completion is rewarding. |
| `src/components/tabs/QuizzesTab.tsx:160-186,227,244,301,357-409,453,472-611` | Complete/undo quiz, edit/delete, add form/modal, filters and fields | completion / add / destructive / form | occasional | `complete` active; remaining legacy sounds (legacy call) | `item_completed`; `item_undone`; `item_added`; `item_deleted`; filter/fields/modal `SILENT` | Mutually exclusive check/undo; no sound on filtering. |
| `src/components/tabs/LectureNotesTab.tsx:47,240,260-295,351,359,480,487,497-624` | Select note, add/edit/delete, search/filters, editor and modal | navigation / add / destructive / form | occasional | none | Add `item_added`; delete `item_deleted`; selection/search/fields/modal `SILENT` | Save/delete can confirm; reading and editing controls remain quiet. |
| `src/components/tabs/RevisionTab.tsx:96,101,111-113,137,229-261,300,385,428,446,477,500,507,555` | Add lesson, review complete/rating, reveal answer, delete, filters and forms | add / completion / reveal / destructive / form | occasional | `add`/modal/delete/tab IDs (legacy call); `complete` active | Add `item_added`; review completion `item_completed`; delete `item_deleted`; reveal/filter/modal `SILENT` | The `complete` vs `tab_switch` rating branches are exclusive; review success earns the cue. |
| `src/components/tabs/AverageTab.tsx:90,100-111,147,274-304,313-397` | Save grade; modes, subject chooser, delete grade, fields, modal close | grade / navigation / destructive / form | occasional | `grade_saved` active; `delete`/`modal_close` (legacy call) | `grade_saved` reward/confirmation; delete `item_deleted`; modes/fields/modal `SILENT` | Grade save is meaningful; editor interactions should not sound. |
| `src/components/tabs/WeeklyReviewTab.tsx:155,1087,1103,1129-1257,1415-1506,1570-1695,1737-2096,2325-2432,2542-2655,2698-2816` | Donut hover, weekly/monthly save, period/date navigation, subject detail, forms, quick log, archived review | chart / save / navigation / form | varied | `complete` active on weekly/monthly save | Saves `item_completed` or `grade_saved` only if semantically a saved review; all browsing/hover/inputs `SILENT` | Avoid audio on charts and browsing; submit once on successful save. |
| `src/components/tabs/TimeBlockingTab.tsx:1449,1777-1868,1915-1931,2008-2029,2262,2305,2567` | Planner actions, sticker drag/drop, create/move/resize blocks, date selection | schedule / drag / resize | occasional; movement frequent | `click` (legacy call) | Add/drop confirmation may use `item_added`; drag movement/snap/resize `SILENT` | Never sound per movement; one cue at committed drop only. |
| `src/components/tabs/TimeBlockingTab.tsx:1564,1622,1687-1710,2330-2457,2527-2542` | Add block/sticker, complete/undo, delete block | add / completion / destructive | occasional | `add`/activity IDs/`uncheck`/`delete` (legacy call); `complete` active | `item_added`; `item_completed`; `item_undone`; `item_deleted` | Existing action IDs pair planner sounds with toasts; same action token must suppress a toast duplicate. |
| `src/components/tabs/TimeBlockingTab.tsx:2629-3567` | Planner add/edit dialog, duration presets, selectors, time fields, validation, submit | form / validation | occasional; field entry frequent | many `click` calls (legacy call) | Successful add `item_added`; validation `error`; fields/presets `SILENT` | One gentle error cue per failed submission, not per field. |
| `src/components/tabs/SettingsTab.tsx:133,146,157,172-208,282-382,414,506-539,599-616,687-908` | Import/restore/reset-like success/error, update controls, settings, sound toggle and preview | settings / system / import / test | occasional | `complete` active; `error` maps to active `toast_error`; click (legacy call) | Import failure `error`; explicit sound preview `ui_tick`; settings and sound toggle `SILENT` | Preference changes stay quiet; actual success/error may give one confirmation. |
| `src/components/tabs/SettingsTab.tsx:968-1241,1320,1393-1400,1448-1476` | Notification permissions/tests, reminders, import/export, reset confirmation | permission / reminder / file / destructive | occasional | `toast_success`/`click`/modal/delete mostly (legacy call); `complete` active | Reminder `reminder`; permission/import error `error`; destructive reset `warning`; import/export `SILENT` | Alerts only when meaningful; file and preference operations do not chirp. |
| `src/components/tabs/BacPcWhatIfSimulator.tsx:202-276,319-665` | Result/achievement, grade sliders/buttons, reset, mentions, presets and fields | milestone / form / destructive | occasional; sliders frequent | `simulator_celebrate`/`streak`/delete/click (legacy call) | Major achievement `milestone`; reset `warning`; slider/selection `SILENT` | Reward only for an actual milestone, not every recalculation. |
| `src/components/charts/StudyHoursChart.tsx:277-318,367-380,642-652` | Period navigation, chart zoom, keyboard and pointer inspection, navigate/focus shortcuts | chart / navigation | frequent | none | `SILENT` | Chart exploration and keyboard/pointer movement are passive. |
| `src/components/shared/QuickAddModal.tsx:111-130,244` | Submit quick add, cancel/close | add / modal | occasional | `add` (legacy call); `modal_close` (legacy call) | Successful submit `item_added`; close `SILENT` | Parent close is silent; avoid paired add + close sounds. |
| `src/components/shared/FocusModeModal.tsx:166-173,218,224,271,287,292,415-418,508-510,612-613` | Start, pause/resume, finish timer, complete/log, abandon, close/navigate | focus / reward / destructive | occasional; finish rare | `focus_start`/`focus_finish`/`complete` active; pause/resume/delete/modal (legacy call) | `focus_start`; `focus_pause`; `focus_resume`; `focus_end_alarm`; completion `item_completed`; abandon `warning`; close/nav `SILENT` | No per-second tick observed in source; timer end is a one-shot effect. Runtime/background behavior remains unverified. |
| `src/components/shared/Toast.tsx:109-118` | Success, warning, error, info toast | system feedback | occasional | success silent / warning active; `toast_error` (legacy alias); info silent | Success `SILENT` if originating action already sounded; otherwise confirmation; warning `warning`; error `error`; info `SILENT` | Toast and semantic cue share `actionId`; do not double-sound. |
| `src/services/notificationService.ts:980` | In-app reminder/notification is raised | system reminder | rare/occasional | `notification` active when non-quiet and setting enabled | `reminder` transition; may play hidden only when context already unlocked | The code checks sound setting; real scheduling/background result is not browser-verified. |
| `src/components/shared/SystemNotificationHUD.tsx:153-181,259-298` | Open notification, dismiss, timeout dismissal | user action / system | occasional | Open `click` (legacy call); dismiss/timeout silent | Open/dismiss `SILENT`; arrival owns the one `reminder` cue | Distinguish notification arrival from later open action. |
| `src/components/shared/NotificationCenterModal.tsx:138-222` | Open item, mark all read, clear all, close/backdrop | notification management | occasional | `click`/`modal_close` (legacy call) | `SILENT` | Read-state and close actions are routine; notification arrival already has its cue. |
| `src/components/shared/NotificationPermissionBanner.tsx:40,55` | Dismiss or enable browser permission | permission / success | rare | `click` (legacy call); `toast_success` (legacy call) | Permission success confirmation, only if no same-action cue; dismiss `SILENT` | A success notice must not double with a toast. |
| `src/components/shared/WebPushSettings.tsx:51-68,191-220` | Subscribe, test push, unsubscribe | notification settings | occasional | success silent / error maps to `error` / click silent | `reminder` for delivered test notification; `error` for failure; settings clicks `SILENT` | Sound only for actual result, not each preference button. |
| `src/components/shared/DatabaseModal.tsx:215-638` | Open/close, status/room/auth tabs, save/sync, copy/generate code, login/logout | modal / sync / account / clipboard | occasional | `modal_close`/`click` (legacy call) | Sync/account/copy/tab/close `SILENT`; failed action `error` | Background sync and navigation remain quiet; errors are user-relevant. |
| `src/components/shared/UpdateBanner.tsx:75-217` | Later, check/install, release notes, dismiss | update / modal | rare | `click` (legacy call) | `SILENT`; failure `error` only if surfaced | Updates should not make ordinary buttons noisy. |
| `src/components/shared/DesktopUpdateBanner.tsx:175,245,382-412` | Desktop update actions | update / modal | rare | `click` (legacy call) | `SILENT`; failure `error` only if surfaced | Kept in map only; file is explicitly out of scope and was not modified. |
| `src/TodoApp.tsx:86-98` | Standalone todo route: filter nav, sync, add/cancel, checkbox, delete, search | navigation / sync / add / completion / destructive | frequent/occasional | no direct `chimePlayer` call observed | Add `item_added`, completion `item_completed`, delete `item_deleted`; nav/search/sync `SILENT` | This separate UI route is included; use one cue only after a successful mutation. |
| `src/components/shared/KeyboardShortcutsModal.tsx` | Open/close shortcuts; press keys in modal | modal / keyboard | occasional | App wrapper may play `modal_open`/`modal_close` | `SILENT` | Modal navigation and key presses are not meaningful sound events. |
| `src/components/shared/ReleaseNotesModal.tsx` | Open/close release notes | modal | rare | none observed | `SILENT` | Informational content stays silent. |
| All tabs/forms, shared dialog editors | Field focus, typing, select/radio/checkbox, slider movement, validation while typing | input / passive | frequent | none or no active matching ID | `SILENT`; one `error` only on submitted invalid form | Avoid fatigue; no sounds on focus or keystrokes. |
| All tabs and shell | Loading, sync progress, theme/language, copy/export/import, scroll, hover, chart tooltip | passive / preference / I/O | frequent | none or (legacy call) generic click | `SILENT` | Passive and repetitive activity remains quiet. |

## Proposed IDs and disposition of existing IDs

| Proposed ID | Mapped intent | Priority | Current engine disposition |
|---|---|---|---|
| `ui_tick` | Opt-in preview/control tick only | tick | Active, but only for explicitly opted-in controls. |
| `item_completed` | Task, goal, habit, quiz, planner, or review completion | reward | Active; legacy `complete` resolves here. |
| `item_added` | Successful task/note/goal/habit/quiz/block add | confirmation | Active; legacy `add` resolves here. |
| `item_undone` | Undo/reopen completed item | confirmation | Active; legacy `uncheck` resolves here. |
| `item_deleted` | Successful delete | confirmation | Active; legacy `delete` resolves here; soft/final. |
| `grade_saved` | Grade form successfully saved | reward | Active, retain. |
| `focus_start` | Focus session starts | confirmation | Active, retain. |
| `focus_pause` | Focus session pauses | transition | Active distinct intent. |
| `focus_resume` | Focus session resumes | transition | Active distinct intent. |
| `focus_end_alarm` | Focus timer reaches zero | reward/alarm | Active; legacy `focus_finish` resolves here. |
| `reminder` | Scheduled/user-enabled reminder delivery | transition | Active; legacy `notification` resolves here. |
| `error` | Submitted action fails or form is invalid | confirmation | Active; `toast_error` also resolves here. |
| `warning` | Destructive reset or non-error caution | confirmation | Active; `toast_warning` resolves here. |
| `milestone` | Streak/achievement threshold reached | reward | Active; legacy `streak` / `simulator_celebrate` resolve here. |

Existing IDs kept, renamed, or dropped deliberately: Use the 14 canonical intent IDs in the table above. Preserve legacy call compatibility: `complete`/`add`/`uncheck`/`delete`/`focus_finish`/`notification`/`toast_error`/`toast_warning` and `streak`/`simulator_celebrate` resolve to their corresponding semantic IDs. Generic `click`, tab/modal transitions, `toast_success`, info toasts, and activity stickers are silent. `camera_snap` and generic drag remain silent because no app interaction needs a sound beyond a committed add/drop.

## Proposed prompt set (not generated)

All are intended as short, non-looping, dry UI SFX with no music, voice, background noise, or long tail. These prompts share a C/E/G tonal anchor but use different materials and envelopes to avoid one repeated timbre. They are **design prompts only**; no result or listening check exists.

| ID | Exact proposed prompt | Target duration |
|---|---|---:|
| `ui_tick` | A single ultra-quiet opt-in UI tick, 0.10 seconds: a tiny dry ceramic fingertip tap with a soft C5 pluck transient, restrained and unobtrusive. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.10 s |
| `item_completed` | A warm task-completion reward, 0.65 seconds: delicate glass-and-wood notes outlining C-E-G, a gentle rising resolution, clear but never triumphant or loud. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.65 s |
| `item_added` | A soft 0.28-second add confirmation: one rounded wooden bead tap followed by a subtle E5 glint, friendly and low energy. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.28 s |
| `item_undone` | A soft 0.24-second undo confirmation: two muted wooden notes descending G-to-E, calm and reversible, not an error. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.24 s |
| `item_deleted` | A restrained 0.25-second delete confirmation: one low felted ceramic tap with a short downward C-major movement, final but not alarming. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.25 s |
| `grade_saved` | A clear 0.35-second grade-saved confirmation: a precise warm mallet pair C5 then E5, assured and understated. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.35 s |
| `focus_start` | A 0.22-second focus-session start cue: a quiet single C5 pluck with a small E5 answer, poised and focused, no countdown feel. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.22 s |
| `focus_pause` | A 0.20-second pause cue: a soft descending pair G5-to-E5 with rounded wooden attack, reassuring and easy to ignore. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.20 s |
| `focus_resume` | A 0.18-second resume cue: one gentle centered C5 note with a light E5 overtone, calm and minimal. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.18 s |
| `focus_end_alarm` | A gentle 0.90-second focus-end alarm: a warm three-note C-E-G chime with a soft pulse and clear decay, noticeable but never startling. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.90 s |
| `reminder` | A 0.50-second reminder cue: a pair of rounded glass notes E5 then G5 with a small gap, attentive and gentle, not urgent. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.50 s |
| `error` | A 0.26-second non-punitive error cue: a muted descending G5-to-E5 pair, clear enough to notice without sounding harsh or alarming. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.26 s |
| `warning` | A 0.32-second gentle warning cue: two low soft C5 pulses with a slight pause, cautionary not threatening, warm and restrained. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.32 s |
| `milestone` | A 0.80-second milestone reward for a streak or achievement: a small expressive C-E-G rising arc with a delicate high C resolution, richer than a tick but still calm. Clean, dry, no music, no voice, no background noise, no long reverb tail. | 0.80 s |

## Double-fire candidates found in source

- Task/Homework/Quiz/Goal/Habit completion and undo are separate conditional branches; source shows one branch per toggle. Runtime call counts remain **[unverified]**.
- Quick-completion helpers call either a semantic completion cue or `click`; the latter now resolves silent. Revision rating likewise chooses `complete` or silent `tab_switch`.
- Planner add/complete/undo/delete handlers pass the same `actionId` to the semantic cue and paired toast. The engine suppresses an equal/lower-priority same-action toast; runtime behavior is **[unverified]**.
- Settings preview success/error branches are exclusive. Legacy `click` is silent, semantic completion aliases to `item_completed`, and standalone success toasts are intentionally silent.
- App modal wrappers may be entered after header controls, but their `modal_open` calls now resolve silent; this avoids a second sound. No header+modal runtime sequence was measured.
- Focus completion and its timer alarm are separate user/system events. Source says the timer alarm is a one-shot effect, but its actual timing/background behavior is **[unverified]**.
- Error/warning toasts share an action token when supplied; without one, the engine's short fallback window suppresses a toast immediately following a semantic cue. Runtime counts are **[unverified]**.

## Sound-source preflight and estimate history

ElevenCreative Terms, Exhibit 4 §2 allows use inside applications but conditions it on the underlying agreement/plan and says output must be combined with other material. The same paragraph prohibits making the output available as isolated audio files or samples, and as a sound/effects library or collection. In this project, `public/sounds/*.mp3` would be independently addressable on the GitHub Pages site; I therefore treat shipping this requested form as **not permitted under the published terms without written ElevenLabs permission**. A paid plan can permit commercial use, but it does not remove this separate isolated-file restriction. The owner's plan status was not available to verify.

Estimate-only calls against `eleven_text_to_sound_v2` returned 50 credits / USD 0.005 per generation. Three separate pilot estimates total **150 credits / USD 0.015**. A full 14-sound estimate was split into counts 4 + 4 + 4 + 2 because the connector caps `generations_count` at 4; results were 200 + 200 + 200 + 100 = **700 credits / USD 0.07**, within the 1,500-credit ceiling. The eleven sounds after a three-sound pilot would account for 550 credits / USD 0.055 at the same per-generation estimate. **No generation call was made and no credits were charged.** Estimate-only calls did create ElevenLabs flow/node records; seven estimate-only flows now exist in the connected workspace, with no generated media.

The SFX generation tool accepts prompt, model, estimate flag and count. The inspected SFX model schema exposes `duration_seconds` 0.5–30, `prompt_influence` 0–1, and `loop`; however the one-shot connector schema does not expose those model parameters or output-format selection. No generation was attempted, so no parameter workaround was used.

Terms checked on 2026-11-01: [ElevenCreative Terms](https://elevenlabs.io/creative-terms), [ElevenLabs Terms of Service](https://elevenlabs.io/terms-of-use), [commercial-use billing documentation](https://elevenlabs.io/docs/overview/administration/billing), [subscription-end commercial rights / attribution](https://elevenlabs.io/docs/help-center/account/general/what-happens-to-my-content-after-my-subscription-ends). These are historical estimate/terms notes; this task uses no generated audio.

The user-mentioned `soundy` connector could not be identified or called in this session: no Lots of Sounds tools were exposed, and Plugin Management search did not return a matching catalog connector. The repo also has no `public/sounds-raw/` or `public/sounds/`. The allowed Kenney fallback is documented in `DOWNLOAD_LIST.md`; official Kenney pages list both [UI Audio](https://kenney.nl/assets/ui-audio) and [Interface Sounds](https://kenney.nl/assets/interface-sounds) as CC0. No Kenney sample was downloaded or selected in this run.

## Runtime status

The Playwright skill executor reached `http://localhost:3001/` but could not launch Chromium. Exact error:

```text
browserType.launch: Executable doesn't exist at C:\Users\Hp\AppData\Local\Packages\sandbox.{9e706ac1-868f-4d15-91b9-17735ea516e3}\AC\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
╚════════════════════════════════════════════════════════════╝
```

No browser runtime counts, background timer results, or perceived loudness results are claimed. See [MANUAL_AUDIO_CHECK.md](MANUAL_AUDIO_CHECK.md) for the browser-side procedure.

## Unmodified files to consider later

- `public/sw.js`: if generated runtime audio is ever authorized, consider runtime-only caching (do not precache the SFX in the PWA install shell).
- `src/components/shared/DesktopUpdateBanner.tsx`: separately decide whether this legacy component should be cleaned up; it was not changed here.

## Additional audited events

These source paths were checked during the refresh. They remain silent unless the event is the same successful action already mapped above:

| Source location | Component / action | Current sound behavior | Decision |
|---|---|---|---|
| `src/App.tsx:437-479,530-537` | Keyboard shortcuts: focus modal, shortcut help, numeric navigation, Escape, sound toggle | Modal/nav IDs resolve silent; explicit sound preview follows its existing completion branch | Shortcuts and toggles silent; a completed action keeps its own cue. |
| `src/components/tabs/TimeBlockingTab.tsx:1421-1426,2740-2791` | Natural-language Planner suggestion/accept action | Success toast only; toast success resolves silent | Silent; parsing a suggestion does not itself commit a schedule block. |
| `src/components/tabs/TimeBlockingTab.tsx:1654,1667` | Planner optimizer failure | Error toast calls `toast_error`, which resolves to `error` | One gentle error cue for the failed action. |
| `src/components/tabs/TimeBlockingTab.tsx:2587-2623` | Reminder card: add session / dismiss | No semantic sound; generic click calls are silent | Silent until the user commits the session. |
| `src/components/tabs/SettingsTab.tsx:1320,1393-1400` | Backup download, import, HTML export | Some existing success paths call `complete`; import errors call `error` | Keyboard/file transfer actions should stay silent; imported-data failure maps to `error`. Existing completion call sites are unchanged in this engine-only phase. |
| `src/components/shared/WebPushSettings.tsx:51-68,191-220` | Push subscribe/test/unsubscribe | Success toast is silent; failure maps to `error`; test delivery maps to `reminder` through notification service | One sound for a real delivered reminder or error; preference controls silent. |
