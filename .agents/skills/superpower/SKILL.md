---
name: superpower
description: >-
  A complete software development methodology for coding agents based on Jesse Vincent's obra/superpowers.
  Triggers on 'superpower/', '/superpower', 'superpowers', or when building complex features, debugging bugs,
  or writing rigorous TDD plans. Enforces spec extraction, bite-sized planning, subagent execution, and root-cause debugging.
---

# Superpower Development Methodology

> Based on the open-source methodology by **Jesse Vincent (obra/superpowers)**.

Superpowers transforms the coding agent from an impetuous code-emitter into a disciplined senior software engineer.
It guarantees that you **never jump straight into coding**, **never guess root causes**, and **never deliver unverified work**.

---

## ⚡ The Core Iron Laws

1. **No coding without a spec and a plan**: If building something new, extract the spec first, then write a bite-sized plan.
2. **No fixes without root cause investigation**: Symptom-patching is failure. Form hypotheses, verify logs/traces, find the exact root cause first.
3. **Strict Test-Driven Development (TDD)**:
   - **RED**: Write a minimal failing test. Run it to watch it fail.
   - **GREEN**: Write the minimal code to make it pass.
   - **REFACTOR**: Clean up while keeping tests green.
4. **Subagent-Driven Execution**: Break plans into bite-sized tasks (2-5 minutes each), dispatching subagents with strict verification gates.
5. **Verification Before Completion**: Never declare a task done until automated commands (lint, build, unit tests) exit with code 0.

---

## 🧭 Workflow Phases

### Phase 1: Brainstorming & Spec Extraction
- Step back and ask clarifying questions to clarify ambiguities.
- Present the specification in small, digestible chunks.
- Lock down scope: YAGNI (You Aren't Gonna Need It) & DRY (Don't Repeat Yourself).

### Phase 2: Writing the Implementation Plan
- Announce: *"I am using the Superpower implementation planning methodology."*
- Map file structures with clear single responsibilities.
- Break down into bite-sized tasks (each task = 1 action: test, run, implement, pass, commit).
- See detailed guide in [writing-plans.md](./references/writing-plans.md).

### Phase 3: Subagent-Driven Execution
- Dispatch tasks one by one to subagents or execute incrementally.
- Fresh review gate between tasks: check diffs, verify regression.
- See detailed guide in [subagent-driven-development.md](./references/subagent-driven-development.md).

### Phase 4: Systematic Debugging (when errors occur)
- **Phase 4.1**: Read error messages completely (don't skip stack traces).
- **Phase 4.2**: Reproduce consistently.
- **Phase 4.3**: Form testable hypotheses and add diagnostics.
- **Phase 4.4**: Implement the targeted fix only after root cause is proven.
- See detailed guide in [systematic-debugging.md](./references/systematic-debugging.md).

### Phase 5: Verification & Completion
- Run compiler/lint (`npm run lint` / `tsc --noEmit`).
- Run tests (`npm test`).
- Verify production build (`npm run build`).
- Present clear summary and diff walkthrough.

---

## 🚀 Invocation
Invoke anytime by typing:
- `superpower/` or `/superpower` followed by your request:
  - `superpower/ build feature X`
  - `superpower/ fix bug Y`
  - `superpower/ refactor module Z with TDD`

