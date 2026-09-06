# Writing Implementation Plans

## Core Philosophy
Write implementation plans so clear that an engineer with zero context could execute them without deviation.

## Key Rules
1. **Bite-Sized Granularity**:
   - Each task has 1 clear deliverable.
   - Steps take 2-5 minutes each:
     - Step A: Write failing test.
     - Step B: Run test (verify red).
     - Step C: Minimal implementation.
     - Step D: Run test (verify green).
     - Step E: Commit.
2. **File Decomposition**:
   - Split by single responsibility.
   - Design focused modules with clear interfaces.
3. **Strict TDD & YAGNI**:
   - Do not add features that were not requested.
   - Keep code DRY without premature abstractions.

