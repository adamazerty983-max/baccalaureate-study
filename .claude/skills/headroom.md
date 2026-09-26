---
name: headroom
description: Apply Headroom context compression techniques to reduce token usage
tags: [optimization, compression, tokens]
---

# Headroom Context Compression

Apply intelligent context compression techniques inspired by Headroom to reduce token usage while maintaining quality.

## Purpose

Optimize context and reduce token consumption by applying compression strategies to:
- Tool outputs and logs
- Large file contents
- JSON payloads
- Code files
- Conversation history

## Compression Strategies

### 1. SmartCrusher for JSON
When processing JSON responses or data:
- Remove whitespace and unnecessary formatting
- Preserve statistical outliers and error messages
- Keep critical data structure intact
- Compress verbose API responses

### 2. Code Compression
For code files and outputs:
- Focus on changed sections, not entire files
- Summarize boilerplate and repetitive patterns
- Preserve critical logic, errors, and edge cases
- Use AST-aware compression (understand code structure)
- Keep function signatures and key comments

### 3. Log Compression
For terminal outputs and logs:
- Extract only errors, warnings, and critical info
- Summarize successful operations
- Preserve stack traces and error messages
- Remove verbose debug output unless relevant

### 4. Conversation Compression
For long conversations:
- Summarize resolved issues
- Keep active decisions and open questions
- Preserve user preferences and instructions
- Remove redundant back-and-forth

## When to Apply

Apply compression when:
- Reading large files (>1000 lines)
- Processing verbose tool outputs
- Dealing with repetitive data structures
- Context window is filling up
- Token budget is a concern

## How to Apply

1. **Before reading files**: Use `limit` and `offset` parameters strategically
2. **After tool outputs**: Summarize rather than echo entire results
3. **For code changes**: Show diffs, not full files
4. **In responses**: Be concise; avoid restating what was just done

## Guidelines

- **Preserve accuracy**: Never compress error messages or critical details
- **Keep context**: Maintain enough information for decision-making
- **Be reversible**: Note what was compressed for future reference
- **Measure impact**: Track token savings vs. quality

## Example Usage

When invoked with `/headroom`, apply these compression principles to:
1. Analyze current context usage
2. Identify compression opportunities
3. Apply appropriate compression strategies
4. Report token savings achieved

---

**Note**: This skill applies Headroom's compression philosophy within Claude Code's capabilities. For the full Headroom toolkit, visit: https://github.com/headroomlabs-ai/headroom
