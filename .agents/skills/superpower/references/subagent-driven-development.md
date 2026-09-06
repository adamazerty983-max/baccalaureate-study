# Subagent-Driven Development

## Principles
1. **Task Dispatching**:
   - Give each subagent a dedicated, single-focus task from the plan.
   - Supply full context and exact files to touch.
2. **Review Gates**:
   - Inspect subagent work immediately upon completion.
   - Run compilation and tests before proceeding to the next task.
3. **Autonomous Endurance**:
   - Allows long-running work across hours without drift because each step is anchored to the plan.

