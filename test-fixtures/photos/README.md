# Photo fixtures for AI extraction tests

The test harness at `scripts/test-ai-extraction.ts` runs image-based test cases against OpenAI GPT-4o Vision using the same prompt + schema the production `/api/public/photo-estimate` endpoint uses. When a photo below is missing, the corresponding test case is **skipped** (not failed) so the suite stays green while photos are staged incrementally.

## Photos to stage

Drop the following files in this directory. Any JPEG, PNG, or WebP works — match the filename exactly:

| File | Subject |
|------|---------|
| `clear-yard-daylight.jpg` | Daylight ground-level photo of a yard where a fence is planned. Clean background, fence run clearly visible. |
| `aerial-property-view.jpg` | Aerial / satellite-style overhead shot of a property line. Useful for the Vision model's "estimate dimensions relative to visible features" rule. |
| `hand-drawn-sketch.jpg` | Photo of a contractor's or homeowner's hand-drawn site plan with dimensions marked in feet. |
| `ambiguous-no-fence.jpg` | A yard photo where no fence location is obvious — interior, crowded, or missing features. Expected to return `allowFailure: true` with a low confidence + flags. |
| `existing-fence-replacement.jpg` | A photo showing an existing fence (chain link, worn wood, etc.) where the customer wants a replacement quote. |

## How to run

```bash
# Run all cases (text + any staged images)
npm run test:ai-extraction

# High-priority only (cheapest, ~$0.05-$0.10 per run)
npm run test:ai-extraction:high
```

The runner loads `OPENAI_API_KEY` from `.env.local`. Cost per image call is ~$0.01-$0.02 on GPT-4o with `detail: high`.

## Security / privacy

- Do **not** commit identifiable photos of real customers.
- Prefer public-domain / your-own-property photos.
- Files under this directory ARE committed to the repo by default; if you want to keep a photo local-only, add an explicit gitignore entry for that filename.
