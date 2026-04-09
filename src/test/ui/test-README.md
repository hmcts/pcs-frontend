# UI test framework

## PFT debug logging (`enable_pft_debug_log`)

`enable_pft_debug_log` in **`playwright.config.ts`** defaults to **`false`**, so there is **no** `[PFT]` debug logging in normal runs.

**To debug:** set it to **`'true'`** in `playwright.config.ts`, push your branch, and check logs on the **preview** pipeline.

**Before merging to `master`:** set it back to **`'false'`**. This is **only for debugging**, not for permanent merges.

Example page-content line when logging is on:

`[PFT] page content validation | page: startNow | url: //case/1775759050353665/respond-to-claim/start-now`
