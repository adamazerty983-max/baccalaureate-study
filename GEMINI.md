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


