# FenceEstimatePro — Advanced Estimator Implementation Spec

**Status:** Build-Ready Technical Specification  
**Version:** 1.0  
**Date:** April 10, 2026  
**Author:** Senior Staff Software Architect & Estimator-Engine Specialist

---

## Overview

This directory contains the complete implementation specification for the **Advanced Fence Estimator** — a rules-driven, graph-based calculation engine that generates install-trustworthy BOMs, validates common jobsite failures, and produces quote-ready pricing output.

**Mission:** Convert FenceEstimatePro's research into a buildable system that eliminates estimation errors, forgotten hardware, and margin erosion.

---

## Document Structure

### 📘 Core Specification
**[ADVANCED_ESTIMATOR_SPEC.md](./ADVANCED_ESTIMATOR_SPEC.md)**
- Executive summary and technical approach
- Complete canonical data model (20+ entities)
- Calculation engine architecture (10 core modules)
- Glossary and key principles

**What you'll find:**
- Entity definitions for `Job`, `FenceDesign`, `FenceNode`, `FenceSection`, `PostConfig`, `BOM`, `BOMLine`, etc.
- Module specs for Design Graph Builder, Node Typer, Waste Engine, Concrete Engine, Gate Resolver, etc.
- Graph-based approach that handles corners, tee junctions, and shared posts

---

### 🔧 Fence-Type Calculation Modules
**[FENCE_TYPE_MODULES.md](./FENCE_TYPE_MODULES.md)**

Fence-type-specific calculation logic for:
1. **Wood Privacy** — Post spacing optimization, rail/picket calculation, volumetric concrete
2. **Chain Link** — Terminal vs. line posts, hardware trees (tension bands, loop caps, tie wires)
3. **Vinyl** — Panel-width locking, manufacturer constraints, aluminum inserts
4. **Aluminum Ornamental** — Pool code compliance, section-based system
5. **Steel/Wrought Iron** — Finishing requirements, heavy-gate wheel support
6. **Composite** — Trex field-assembled, SimTek pre-cast panels

**Key insight:** Wood ≠ vinyl ≠ chain link. Each has separate logic, not forced abstractions.

---

### ✅ Validation Rules & Runtime Flow
**[VALIDATION_AND_FLOW.md](./VALIDATION_AND_FLOW.md)**

- **Validation Matrix:** 20+ BLOCK rules (prevents impossible states) + 15+ WARN rules
- **Runtime Flow:** 12-step execution sequence from user input to quote-ready output
- **Override System:** Where users can override calculations + audit trail
- **Dependency Order:** Sequential vs. parallel execution

**Sample validations:**
- `HARDWARE_001`: Gates without hinges → BLOCK
- `HARDWARE_004`: Chain link with incorrect tension band count → BLOCK
- `SPACING_001`: Wood post spacing >8ft → BLOCK (rails will sag)
- `CONCRETE_101`: Frost zone 3 with depth <36" → WARN (posts may heave)

---

### 🚀 MVP Build Order
**[MVP_BUILD_ORDER.md](./MVP_BUILD_ORDER.md)**

4-phase implementation plan:

**Phase 1 (Weeks 1-4): Wood Privacy MVP**
- Prove graph-based calculation works
- Generate accurate BOMs for wood privacy
- Success: 5 beta contractors using system

**Phase 2 (Weeks 5-6): Chain Link Module**
- Stress-test hardware resolver
- Validate validation system (complex hardware trees)

**Phase 3 (Weeks 7-9): Vinyl + Mixed Materials**
- Handle manufacturer constraints
- Support multi-material jobs (wood + vinyl)

**Phase 4 (Weeks 10-12): Remaining Types + Calibration**
- Complete fence type coverage
- Build calibration loop (the moat)
- After 50 jobs: system knows contractor's actual waste, labor rates, concrete usage

---

### ❓ Open Questions & Assumptions
**[OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md)**

- Technical assumptions requiring validation (performance, SKU resolution, waste accuracy)
- Business logic questions (frost depth data source, post sizing thresholds, gate support rules)
- Validation severity tuning (BLOCK vs. WARN thresholds)
- Integration questions (catalog sync frequency, tax calculation)
- UX/UI decisions (wizard vs. single-page, BOM display format)
- Beta research questions (accuracy targets, close rate improvement, mobile vs. desktop usage)
- Key architectural decisions documented

---

## Source Documents

This specification synthesizes three research documents:

### 1. FenceEstimatePro Deep Analysis
**[context/deep-analysis.txt](./context/deep-analysis.txt)**
- 20-year fence industry veteran perspective
- Real-world pain analysis (measurement errors, material calculation, pricing volatility)
- Internet & competitor gap analysis
- Dream tool breakdown
- Prioritized product roadmap
- Unfair advantage ideas

### 2. Pain → Feature Destruction Map
**[context/pain-to-feature-map.txt](./context/pain-to-feature-map.txt)**
- System architecture (10 core modules)
- Zero-error estimate system (4 validation layers)
- Close rate engine (visual selling, Good/Better/Best, one-click acceptance)
- Owner control panel (KPI dashboard, leakage detection)
- Self-improving system (calibration loop, lock-in)
- Build priority matrix

### 3. Material Engine Bible
**[context/material-engine-bible.txt](./context/material-engine-bible.txt)**
- Top 6 fence types (market share, price ranges, subtypes)
- Full material breakdown per type (posts, rails, panels, gates, hardware, concrete)
- Calculation formulas (post count, rail count, waste factors, concrete volumetric)
- Data model design (entities, relationships)
- What 99% of software gets wrong (spacing, terrain, gate hardware, waste, concrete, chain link hardware, manufacturer systems, feedback loops)

---

## Quick Start Guide

### For Engineering Team

**Week 1-2: Database Setup**
1. Review canonical data model (ADVANCED_ESTIMATOR_SPEC.md, Section 2)
2. Create Postgres schema for core entities
3. Implement `fence_type`, `fence_design`, `fence_node`, `fence_section`, `bom`, `bom_line`
4. Seed wood privacy configuration data

**Week 3-4: Core Modules**
1. Implement Design Graph Builder
2. Implement Node Typer
3. Implement Section Normalizer
4. Implement Wood Privacy calculation module
5. Implement BOM Assembler
6. Implement basic validation (5 critical BLOCK rules)

**Week 4: First Working Estimate**
- Generate BOM for 200ft wood privacy, 6 corners, 2 walk gates
- Validate accuracy vs. hand calculation
- Deploy to 3 beta contractors

**Weeks 5-12: Iterate per MVP phases**

---

### For Product Managers

**Immediate Actions:**
1. Recruit 5 beta contractors for Phase 1
2. Define success metrics (accuracy <5%, speed <5 min, close rate +10-20%)
3. Set up weekly feedback sessions
4. Plan Phase 2 decision gate (Week 6)

**Key Questions to Answer:**
- What's acceptable post spacing range? (Currently 6-8ft)
- Should BLOCK rules be overrideable? (Recommendation: Type 1 no, Type 2 yes with explanation)
- How often should supplier catalogs sync? (Recommendation: Daily automated)
- What's the right pricing freshness threshold? (Recommendation: Material-specific — lumber 14 days, vinyl 60 days)

---

### For Designers

**Phase 1 UI Scope:**
- Simple estimate builder (linear footage input, height selector, gate count)
- BOM display (grouped by category)
- Basic quote output (pricing breakdown, Good/Better/Best cards)

**Future Phases:**
- Map-based fence line drawing (Phase 3)
- Customer-facing visual quote with property overlay (Phase 3)
- Job costing dashboard (Phase 4)
- Calibration insights ("Your waste is 7.2%, not 5%") (Phase 4)

---

## Key Metrics

### Accuracy Targets
- **Material variance:** <5% estimated vs. actual (after 20 jobs)
- **Forgotten items:** 0% (validation prevents)
- **SKU resolution:** >95% auto-match rate
- **Calculation speed:** <5 seconds for standard residential job

### Business Outcomes
- **Estimate time:** 45-90 min manual → <5 min automated
- **Close rate improvement:** +10-20% (via Good/Better/Best)
- **Margin protection:** Eliminate 5-10% erosion from pricing drift
- **Time savings:** 75-150 hours/year per contractor

### Moat Metrics
- **Calibration improvement:** 15-20% variance → <5% after 50 jobs
- **Switching cost:** Lose all calibration data (proprietary intelligence)
- **Network effect:** Regional pricing intelligence scales with user count

---

## Critical Success Factors

1. **Prove calculation accuracy** — BOM within 3% of hand calculations
2. **Zero forgotten hardware** — Validation catches 100% of test errors
3. **Fast enough** — <5 seconds end-to-end
4. **Mobile-first works** — 60% of usage on phones in field
5. **Calibration drives retention** — Contractors with 20+ closeouts have <10% churn

---

## Anti-Patterns to Avoid

❌ **Don't build all 6 fence types in Phase 1** — Delays feedback, compounds bugs  
❌ **Don't build map drawing before proving calculator** — Wrong priority  
❌ **Don't perfect calibration before launch** — No data to calibrate yet  
❌ **Don't build customer configurator first** — Contractors need estimator first  
❌ **Don't integrate all suppliers in Phase 1** — Complexity explosion

✅ **Do:** Start with wood privacy MVP, prove engine works, get user feedback, layer complexity

---

## Technical Debt to Track

**Acceptable for MVP:**
- Manual linear footage input (no map drawing)
- Single supplier catalog (manual price entry)
- Basic PDF quote output (no visual property overlay)
- No job costing / calibration loop yet

**Must fix by Phase 4:**
- Add satellite measurement
- Multi-supplier SKU resolution
- Visual quote with property overlay
- Job costing feedback loop

---

## License & Usage

**Internal:** FenceEstimatePro engineering documentation  
**Status:** Build-ready specification  
**Contact:** Product & Engineering Team

---

**Last Updated:** April 10, 2026  
**Specification Version:** 1.0  
**Next Review:** After Phase 1 beta (Week 4)

