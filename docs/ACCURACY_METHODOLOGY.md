# FenceEstimatePro — Estimation Accuracy Methodology

**Last updated:** April 16, 2026

## How We Calculate Estimates

FenceEstimatePro uses a **graph-based estimation engine** — not simple formulas or spreadsheets. Every estimate follows the same deterministic pipeline:

### 1. Project Input
You enter fence measurements (total linear feet + corners, or run-by-run), fence type, height, soil conditions, gates, and site options. The AI extraction mode can also derive these from a text description or site photo.

### 2. Graph Construction
The engine builds a structural graph of your fence project: posts at mathematically optimal spacing, corner/end/gate post classification, slope analysis (racked vs stepped), and section segmentation that minimizes panel waste.

### 3. Bill of Materials (BOM)
Each fence type has its own BOM generator:
- **Vinyl**: posts, panels/pickets, rails (cutting-stock optimized), brackets, sleeves, caps, concrete, gravel, fasteners, reinforcement (wind mode)
- **Wood**: posts, rails, boards/panels (privacy, picket, or board-on-board), concrete, gravel, hurricane ties, carriage bolts
- **Chain Link**: terminal + line posts (10ft OC), fabric (per LF), top rail, tension wire/bars/bands, brace bands, loop caps, concrete
- **Aluminum**: posts, panels, flat rails, set screws, concrete

Every quantity is computed from the graph — no lookup tables or per-foot multipliers.

### 4. Concrete Calculation
Concrete is calculated volumetrically per post:
- Cylindrical hole volume (based on hole diameter × depth)
- Minus gravel base volume
- Minus post displacement (square post in cylindrical hole)
- Adjusted for soil type (sandy +20%, wet +25%)
- Adjusted for wind/hurricane zone (minimum 36" depth)
- Gate posts get +6" additional depth
- Result: exact bags needed per post (80lb bags at 0.60 cu ft yield)

### 5. Gate Pricing
Each gate is priced deterministically:
- SKU selection by fence type + single/double
- Hardware package: hinges, latch, stops, drop rod (doubles), spring closer (pool gates)
- Labor hours: base hours × width multiplier × fence-type modifier × pool-code modifier

### 6. Labor Hours
Labor is broken down by activity:
- Hole digging, post setting, section/panel installation, cutting operations, gate installation, racking (slope), concrete pour
- Plus overhead: job setup, layout/string line, daily cleanup
- Plus efficiency multiplier for difficult sites
- Plus old fence removal (if applicable)

### 7. Cost Aggregation
- Material costs from your org's price map (or industry defaults)
- Equipment rentals (auger, mixer, stretcher, saw) based on job complexity
- Delivery fee (waived above a threshold)
- Regulatory costs (permits, inspections, engineering, survey — entered by you)
- Regional material and labor multipliers
- Minimum job charge (configurable)

### 8. Waste Factor
- **Deterministic scrap**: calculated from panel segmentation (how much of each panel is cut and wasted)
- **Probabilistic waste**: configurable percentage (default 5%) applied to material quantities
- **Calibration**: the waste factor learns from your closeout data via an EWMA (Exponential Weighted Moving Average) that converges to your crew's actual waste rate over time

## Confidence and Red Flags
- Every BOM line item carries a confidence score (0–1)
- Items below 80% confidence are flagged as "red flags" for manual review
- Missing prices are flagged, not silently zeroed
- The overall estimate confidence is the average across all line items

## What Affects Accuracy
| Factor | Impact | How to improve |
|---|---|---|
| **Accurate measurements** | High | Use actual measurements, not estimates. AI extraction flags uncertain dimensions |
| **Correct soil type** | Medium | Affects concrete quantity by 10-25%. Get a soil sample or check county records |
| **Gate dimensions** | Medium | Specify exact opening width. Double vs single matters significantly |
| **Wind/hurricane zone** | Medium | Adds rebar, aluminum inserts, deeper concrete. Don't skip if applicable |
| **Your price map** | High | Default prices are Q1 2026 wholesale averages. Override with your actual supplier pricing in Settings |
| **Waste calibration** | Low-Medium | Improves over time as you close out completed jobs. More closeouts = better calibration |
| **Labor rate** | High | Must reflect your actual crew cost (wages + insurance + benefits). Default is $65/hr |

## How Calibration Works
After completing a job, you enter actual waste percentage, labor hours, and costs. The system:
1. Computes variance against the original estimate
2. Generates calibration signals (which config areas to adjust)
3. Updates the EWMA waste factor (bounded between 3% and 15%)
4. Produces a learning summary for your review

The more jobs you close out, the more accurate future estimates become. The first few closeouts carry reduced weight (cold-start damping) to prevent a single anomalous job from swinging the calibration.

## Pricing Defaults
Default material prices are based on **Q1 2026 US wholesale supplier averages** with regional adjustments:
- Base: East Coast / Mid-Atlantic
- Northeast: +15%
- Southeast: -5%
- Midwest: -12%
- Florida: +8%
- West Coast: +28%

You should override these with your actual supplier pricing in **Settings > Estimator Configuration**.
