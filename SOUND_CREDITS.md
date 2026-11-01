# Sound credits

No recorded audio assets are shipped by this change. The seven active cues are synthesized at runtime in `src/utils/audio.ts` with Web Audio oscillators, filtered noise, and envelopes. They use no external samples, packs, or generation service; there are no per-file source recordings or third-party sound licenses to list.

| Sound id | Implementation | External source / author / license |
|---|---|---|
| `ui_tick` | Quiet filtered noise plus a C5 sine transient; opt-in only | None; synthesized in project code |
| `complete` | C5–E5–G5–C6 sine chord | None; synthesized in project code |
| `focus_start` | C5/E5 sine pair | None; synthesized in project code |
| `focus_finish` | Short C/E/G/C alarm chord | None; synthesized in project code |
| `notification` | E5/G5 sine pair | None; synthesized in project code |
| `toast_error` | Gentle descending G4/E4 pair | None; synthesized in project code |
| `grade_saved` | C5/E5 sine pair | None; synthesized in project code |

The official [Kenney UI Audio](https://kenney.nl/assets/ui-audio) and [Interface Sounds](https://kenney.nl/assets/interface-sounds) pages identify those packs as CC0. Kenney's [support page](https://kenney.nl/support) says its asset-page content is usable commercially and attribution is optional. No pack was downloaded or included: the development environment could not resolve `kenney.nl` (`No such host is known`). The Kenney assets are therefore not sources for any sound above.

The synth implementation follows the repository's code licensing terms; the repository license was not audited as part of this change.
