---
name: headroom
description: "Context optimization, token compression, AST structural code manipulation, and cross-agent memory layer. Use ALWAYS to compress tool outputs, logs, JSON, and broad codebase reads, trim conversational ceremony and verbosity, perform structural ast-grep/difftastic operations, and learn from tool failures."
license: Apache-2.0
metadata:
  author: headroomlabs-ai
  version: "0.37.0"
---

# Headroom — Context Optimization & Compression Layer

Headroom compresses everything the AI agent reads (tool outputs, logs, search results, files, JSON, and conversation history) before reasoning over it, and shapes agent output to maximize token efficiency, accuracy, and signal-to-noise ratio.

```
       Your Agent / Workflow (Antigravity)
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────┐
 │  Headroom Engine (Local Execution — 0 Latency)           │
 │  ──────────────────────────────────────────────────────  │
 │  • ContentRouter: Code (AST) | JSON | Logs | Search      │
 │  • SmartCrusher: 60-95% compression on repetitive data   │
 │  • Verbosity Steering: Zero preamble, zero ceremony      │
 │  • ast-grep (`headroom sg`) & difftastic (`headroom diff`)│
 │  • Cross-agent Memory & Tool Failure Learning (`learn`)  │
 └──────────────────────────────────────────────────────────┘
                        │
                        ▼
             LLM Reasoning & Output
```

---

## Core Operational Directives (Always Enforced)

### 1. Zero-Ceremony Verbosity Steering
- **Eliminate Preambles & Fillers**: Never say *"Sure, I would be happy to help with that!"*, *"Let me think about how to accomplish this..."*, or restate the user's prompt verbatim.
- **Direct High-Density Output**: Deliver the immediate answer, code snippet, diff, or structural result.
- **Preserve Cache Alignment**: Keep system prompts and recurring headers identical to ensure maximum prompt caching efficiency.

### 2. Intelligent Content Compression (SmartCrusher & Router)
When reading, searching, or processing large volumes of data:
- **Search & Grep Results**: Focus strictly on matching symbol declarations, call sites, and immediate parent blocks. Omit hundreds of lines of boilerplate.
- **Logs & Diagnostics**: Extract the `FATAL`, `ERROR`, exception trace, and initial root-cause lines. Compress hundreds of repetitive routine lines into `[... X identical info lines omitted ...]`.
- **JSON & Data Structures**: Eliminate duplicate schema keys in object arrays. Extract target fields directly without holding massive unindexed arrays in working memory.
- **Codebase Exploration**: Use AST-level signatures (interface/class declarations, exported functions, prop types) rather than loading entire multi-thousand-line implementation files.

### 3. Structural Code Manipulation (`headroom sg` & `diff`)
Use Headroom's bundled structural tools whenever inspecting or refactoring:
- **`headroom sg` (ast-grep)**: Structural AST-aware code search and rewrite across languages without regex fragility.
  ```bash
  headroom sg -p 'function $FUNC($$$ARGS) { $$$BODY }'
  ```
- **`headroom diff` (difftastic)**: Syntax-aware structural diffing that ignores trivial whitespace and formatting shifts.
  ```bash
  headroom diff <fileA> <fileB>
  ```
- **`headroom loc` (scc)**: Fast code and comment metrics across the repository.
  ```bash
  headroom loc
  ```

### 4. Cross-Agent Memory & Failure Learning (`headroom learn`)
- When a command or tool encounters a syntax, build, or runtime failure:
  1. Record the failure mechanism and the exact corrective action into memory.
  2. Avoid repeating the failed pattern in subsequent turns.
- Check and manage stored patterns via:
  ```bash
  headroom memory stats
  headroom memory list
  headroom learn
  ```

---

## Python SDK Reference

Headroom provides an in-process compression SDK:

```python
from headroom import compress

# Compress conversation or tool payloads
result = compress(
    messages=[{"role": "user", "content": "..."}],
    model="gemini-2.5-pro"
)

# Access savings
print(f"Saved {result.tokens_saved} tokens ({result.compression_ratio:.1%})")
```

---

## Standard Execution Checklist

Whenever executing any task under Headroom:
1. **Compress Inputs**: Is the file/search/log payload filtered to the essential signal?
2. **Eliminate Ceremony**: Is the response concise, punchy, and dense without conversational fluff?
3. **Accurate Preservation**: Are critical identifiers, types, error codes, and exact values 100% byte-for-byte preserved?
4. **Learn & Cache**: Has any encountered bug or mistake been retained to prevent re-occurrence?
