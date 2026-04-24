# Wood Fence Calculator - Phase 1 MVP

Graph-based wood privacy fence estimation engine.

## Overview

This module implements the core calculation logic for Phase 1 of FenceEstimatePro:
- Wood privacy fences only
- Graph-based design (nodes = posts, sections = runs)
- Optimized post spacing (6-8ft, no stub bays)
- Pure functions (no side effects, easy to test)

## Modules

### CALC-001: Graph Builder
**File:** `graph-builder.ts`

Converts user input (linear feet, corners, gates) into a fence graph.

```typescript
import { buildDesignGraph } from './graph-builder'

const result = buildDesignGraph({
  total_linear_feet: 100,
  corner_count: 2,
  gates: [{ width_ft: 3, position_ft: 50 }],
  height_ft: 6
}, 'design-id')

// result.nodes → FenceNode[]
// result.sections → FenceSection[]
// result.gates → Gate[]
```

### CALC-002: Node Typer
**File:** `node-typer.ts`

Classifies nodes based on topology and assigns post configurations.

```typescript
import { classifyAndConfigureNodes } from './node-typer'

const typedNodes = classifyAndConfigureNodes(nodes, sections)

// Each node now has:
// - node_type: 'end_post' | 'line_post' | 'corner_post' | 'gate_post'
// - post_size: '4x4' | '6x6'
// - post_config_id: reference to post_configs table
```

### CALC-003: Spacing Optimizer
**File:** `spacing-optimizer.ts`

Optimizes post spacing to avoid stub bays and ensure structural integrity.

```typescript
import { optimizeSpacing } from './spacing-optimizer'

const result = optimizeSpacing(section)

// Examples:
// 24ft → 3 bays @ 8ft (perfect fit)
// 26ft → 4 bays @ 6.5ft (avoids 3@8 + 2ft stub)
// 50ft → 7 bays @ 7.14ft
```

## Key Principles

### 1. Pure Functions
All calculation functions are pure - no database calls, no side effects. This makes them:
- Easy to test
- Easy to reason about
- Composable
- Cacheable

### 2. Validation Errors
Spacing optimizer throws `ValidationError` for impossible states:
- Spacing < 6ft → too short
- Spacing > 8ft → rails will sag

Catch these errors to prevent bad estimates.

### 3. Traceability
Every calculation preserves the "why" through:
- calculation_notes fields (coming in BOM modules)
- Node/section relationships preserved in graph

## Testing

Run basic tests:
```bash
npx tsx src/lib/wood-fence-calculator/test-basic.ts
```

All tests should pass before deploying.

## Database Schema

Requires migrations:
- `20260410120000_fenceestimatepro_phase1_core_schema.sql`
- `20260410120100_fenceestimatepro_phase1_config_schema.sql`
- `20260410120200_fenceestimatepro_phase1_seed_wood_privacy.sql`

Tables created:
- `fence_designs` - Design records
- `fence_nodes` - Posts in the graph
- `fence_sections` - Runs between posts
- `gates` - Gate specifications
- `boms` - Bill of materials
- `bom_lines` - Individual BOM items
- Config tables: `fence_types`, `post_configs`, `rail_configs`, etc.

## Next Steps (Remaining CALC Modules)

- **CALC-004:** Post calculator (count by type, handle shared nodes)
- **CALC-005:** Rail calculator (height-dependent rails)
- **CALC-006:** Picket calculator (privacy style, waste)
- **CALC-007:** Concrete calculator (volumetric, frost zones)
- **CALC-008:** Gate hardware resolver
- **CALC-009:** BOM assembler (aggregate all calculations)

## Usage Example

```typescript
import {
  buildDesignGraph,
  classifyAndConfigureNodes,
  optimizeAllSections,
  calculateTotalBays
} from '@/lib/wood-fence-calculator'

// 1. Build graph from user input
const graph = buildDesignGraph({
  total_linear_feet: 200,
  corner_count: 6,
  gates: [{ width_ft: 4, position_ft: 100 }],
  height_ft: 6
}, designId)

// 2. Classify nodes
const typedNodes = classifyAndConfigureNodes(graph.nodes, graph.sections)

// 3. Optimize spacing
const optimizedSections = optimizeAllSections(graph.sections)

// 4. Calculate totals
const totalBays = calculateTotalBays(optimizedSections)
const totalPosts = typedNodes.length

console.log(`Design: ${totalPosts} posts, ${totalBays} bays`)
```

## Status

✅ **Complete:**
- DB-001: Core schema
- DB-002: Config schema + seed data
- CALC-001: Graph builder
- CALC-002: Node typer
- CALC-003: Spacing optimizer

⏳ **Remaining:**
- CALC-004 through CALC-009 (material calculations)
- VAL-001 through VAL-003 (validation engine)
- API-001 through API-004 (API layer)
- UI-001, UI-002 (minimal UI)
- TEST-001 through TEST-004 (testing)
