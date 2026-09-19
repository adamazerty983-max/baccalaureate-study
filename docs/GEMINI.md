# Workspace Agent Rules

## Superpower Protocol Invocation
When the user prefixes any request with `superpower/` or `/superpower`, or asks for "Superpower mode":
1. **Activate the `superpower` skill**: Load and strictly adhere to [SKILL.md](file:///.agents/skills/superpower/SKILL.md).
2. **Phase 1 - Spec & Discovery**: Never start coding directly. Clarify requirements in small, digestible chunks.
3. **Phase 2 - Plan**: Create a detailed, bite-sized implementation plan using TDD, DRY, and YAGNI.
4. **Phase 3 - Debugging**: If dealing with errors, enforce the Iron Law: *No fixes without root cause investigation first*.
5. **Phase 4 - Verification**: Verify all changes with automated compilation (`npm run lint`), tests, and builds before marking complete.

## Designer Protocol Invocation
When the user prefixes any request with `Designer/`, `/designer`, or asks for "Designer mode":
1. **Activate the `designer` skill**: Load and strictly adhere to [SKILL.md](file:///.agents/skills/designer/SKILL.md).
2. **Adopt Lead Frontend Designer Persona**: Act as a bespoke design lead; reject generic AI templates (no cookie-cutter cards, no cliché cream/clay palettes, no tracked-out all-caps eyebrows).
3. **2-Pass Execution**:
   - **Pass 1 (Concept)**: Propose subject-grounded 4–6 hex color tokens, typography scale, and layout structure (with ASCII wireframes).
   - **Pass 2 (Build)**: Implement production-grade React + Tailwind CSS with responsive layout, accessible contrast, and intentional micro-interactions.

## Canvas Design Protocol Invocation
When the user prefixes any request with `/canvas`, `canvas/`, or asks for "Canvas Design mode":
1. **Activate the `canvas-design` skill**: Load and strictly adhere to [SKILL.md](file:///.agents/skills/canvas-design/SKILL.md).
2. **2-Step Art Creation**:
   - **Step 1 (Design Philosophy Creation)**: Output a `.md` manifesto naming the movement (1-2 words) with 4-6 paragraphs on form, space, color, material, and composition, emphasizing master craftsmanship.
   - **Step 2 (Canvas Visual Expression)**: Express the philosophy visually into a `.png` or `.pdf` artifact (90% visual design, 10% essential text).

## UI/UX Pro Max Protocol Invocation
When the user prefixes any request with `/UIUX`, `UIUX/`, or asks for "UIUX mode":
1. **Activate the `ui-ux-pro-max` skill**: Load and strictly adhere to [SKILL.md](file:///.agents/skills/ui-ux-pro-max/SKILL.md).
2. **Execute Design Intelligence Engine**:
   - Run `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system` to generate a data-backed design system (layout pattern, style, accessible color palette, typography pairing).
   - Use domain queries (`style`, `color`, `typography`, `ux`, `chart`) as needed to extract specific guidelines from the 50+ styles and 99 UX rules database.
3. **Enforce Pre-Delivery Standards**:
   - No emoji icons (use SVG/Lucide).
   - 4.5:1 minimum text contrast ratio (WCAG AA).
   - Minimum 44x44px touch targets.
   - Smooth 150-300ms transitions and visible keyboard focus states.
   - Fully responsive across mobile, tablet, and desktop viewports.

## Direct Protocol Invocation
When the user prefixes any request with `direct/`, `/direct`, or asks for "Direct mode":
1. **Activate the `direct` skill**: Load and strictly adhere to [SKILL.md](file:///.agents/skills/direct/SKILL.md).
2. **Zero-Ceremony Direct Execution**: Bypass exploratory interviews, spec discovery rituals, and planning approval steps when instructions are clear.
3. **Decisive Implementation**: Jump directly to code changes and tool execution with precision, high craftsmanship, and clean architecture.
4. **Self-Verification**: Validate with type check (`npm run lint`), build, or dev server checks immediately.
5. **Concise Reporting**: Summarize changes cleanly and directly without bloated boilerplate.

## UI Sound Design Protocol Invocation
When the user prefixes any request with `/sound`, `sound/`, `/audio`, `audio/`, or asks for "UI Sound Design mode":
1. **Activate the `ui-sound-design` skill**: Load and strictly adhere to [SKILL.md](file:///C:/Users/Hp/.agents/skills/ui-sound-design/SKILL.md).
2. **Interactive Audio Synthesis**: Use programmatic Web Audio API and Tone.js synthesis (no external audio files required).
3. **4-Step Sound Loop**:
   - **Describe**: Identify trigger (click, hover, toggle, complete, error), emotional tone, and prominence.
   - **Generate**: Synthesize oscillator frequencies, waveforms (sine, triangle), filters, and ADSR envelopes.
   - **Listen & Refine**: Adjust attack, decay, pitch ramps, and volume levels for maximum ear comfort.
   - **Accessible**: Always respect user mute settings, avoid auditory fatigue, and keep durations under 300ms for micro-interactions.

## Headroom Context Optimization Protocol (ALWAYS ACTIVE ON EVERY REQUEST)
Headroom is the mandatory context compression, AST optimization, and token reduction layer for ALL agent interactions:
1. **Always Activate the `headroom` skill**: Strictly adhere to [SKILL.md](file:///.agents/skills/headroom/SKILL.md).
2. **Zero-Ceremony & Token Efficiency**:
   - Strip conversational pleasantries, preambles, and verbatim restatements of user requests.
   - Deliver high-density, precise solutions with maximal signal-to-noise ratio.
3. **Smart Content Compression**:
   - Filter and compress tool outputs, grep/search results, logs, and multi-line data structures before reasoning over them.
   - For logs, isolate root causes (`FATAL`, `ERROR`, stack traces) and omit repetitive benign lines.
   - For JSON and state files, use SmartCrusher structural compaction.
4. **AST & Structural Tooling**:
   - Leverage `headroom sg` (ast-grep), `headroom diff` (difftastic), and `headroom loc` for structural code comprehension and manipulation.
5. **Continuous Learning & Failure Recovery**:
   - When encountering errors, learn the root cause and record preventative patterns in memory (`headroom learn`) to prevent regression.

## Auto-Execute Permission (ALWAYS ACTIVE — NO EXCEPTIONS)
The user has granted **full and permanent pre-authorization** for ALL tool calls and commands in this workspace:
1. **Never ask for permission** before running any command, script, file edit, build, server start, or tool call.
2. **Never pause to request confirmation** mid-task — execute every step autonomously and report results afterward.
3. **Never show permission dialogs or ask "Can I...?"** — the answer is always YES.
4. This applies to: shell commands, PowerShell scripts, npm/node processes, file creation/deletion, builds, browser automation, and any other tool.
5. If the user is away from the computer, complete the entire task independently and summarize results when they return.
