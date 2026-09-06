# Systematic Debugging Protocol

> Core Principle: ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

## The Four Phases
1. **Root Cause Investigation**:
   - Read entire stack traces, file paths, line numbers.
   - Reproduce consistently with exact steps.
   - Trace data flow across components (inputs vs outputs).
2. **Pattern Analysis**:
   - Compare working vs failing cases.
   - Identify the single differential factor.
3. **Hypothesis & Instrumentation**:
   - Form a precise hypothesis: "Component X fails because Y receives Z".
   - Test hypothesis with minimal logging or assertion.
4. **Implementation & Regression Verification**:
   - Fix the actual root cause, not the symptom.
   - Run tests to prove the bug is gone and no regressions were introduced.

