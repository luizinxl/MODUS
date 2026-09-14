---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ before ANY action or answer.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

CRITICAL RULES:
- **MANDATORY FIRST STEP:** Before answering ANY question about the codebase, architecture, or planning ANY changes, you MUST consult the graphify graph.
- First, run `graphify query "<question>"` (CLI) or `query_graph` (MCP) to understand the context.
- Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts.
- Do NOT use `grep_search` or read raw files blindly before consulting the graph.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review.
- After modifying code files in this session, run `graphify update .` to keep the graph current.
