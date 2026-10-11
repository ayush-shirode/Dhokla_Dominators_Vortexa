# Research prompt: ration card types and entitlements for every state

Use this with a research assistant to extend or refresh `ration_data/india_ration_entitlements.csv`
(then run `pnpm build:card-catalog`). Output columns must match the existing CSV.

```
ROLE
You are a careful policy researcher. Build a sourced dataset of every ration card type used in
India and its monthly foodgrain entitlement, for all 28 states and 8 union territories. Accuracy
and traceability matter more than completeness: a blank or "UNKNOWN" is always better than a guess.

WHY THIS DATA IS NEEDED
A ration-card holder picks their state and card type in an app. The app pre-fills the monthly
entitlement (kg), shows the official source, and compares it with what they received. A wrong
figure gives a household a wrong shortfall, so every number needs a source that can be opened.

SCOPE: for each state / UT find
1. Every ration card category currently issued, named exactly as the state prints it, with any
   local code or colour (e.g. "PHH [31]", "BPL Yellow", "APL White", "NPH", "NER", "Annapurna").
2. For each: AAY, PHH, STATE_SCHEME, NOT_ENTITLED or UNKNOWN (use only these).
3. The monthly entitlement: basis (per member / per family), total kg, split by commodity if
   published, price per kg, and whether NFSA grain is currently free (which scheme, until when).
4. Who qualifies (one line), limits or regions, and whether it varies by month/season/district.

SOURCES, in priority order: state food & civil supplies department sites and their GRs/orders/
gazettes; nfsa.gov.in and the Dept of Food & Public Distribution; state e-PDS portals; official
parliamentary replies and PIB (to corroborate only). No blogs, news or aggregators for numbers.

RULES
- Never infer or average. Not stated = UNKNOWN. Copy the exact wording of the figure into `quote`.
- Every row needs a source URL, document title, document date and retrieval date (YYYY-MM-DD).
- Give the CURRENT position; if an order is superseded, use the latest and note the older one.
- If two official sources disagree, output both rows with conflict=YES. Do not choose.
- If a page is behind a captcha/login or unreachable, say so in access_issue; never skip silently.
- Do not guess a category's NFSA status from its name. Keep language neutral and factual.

OUTPUT
A. CSV with exactly: state_code, state_name, card_name_as_printed, card_code_or_colour,
   nfsa_category, basis, quantity_kg, rice_kg, wheat_kg, coarse_grain_kg, price_per_kg_inr,
   who_qualifies, limits_or_regions, varies_by, effective_from, source_title, source_url,
   source_type, source_date, retrieved_on, quote, confidence, conflict, access_issue, notes
   (state_code = ISO 3166-2:IN suffix; basis = PER_MEMBER | PER_FAMILY | UNKNOWN;
   nfsa_category = AAY | PHH | STATE_SCHEME | NOT_ENTITLED | UNKNOWN; confidence = HIGH | MEDIUM | LOW)
B. A coverage table per state/UT (categories found, with a sourced kg figure, UNKNOWN, obstacle).
C. A list of every conflict and every figure that could not be sourced.

METHOD: one state at a time, alphabetically; finish and output a state before the next. Start
with the state's own list of card types, then find each entitlement. Re-open each source once to
confirm a figure before writing it. Finish with a self-check: every row has a URL, a date and a
quote, and no figure appears that is not in its quote.
```

## What the app does with the result
- AAY / PHH rows from an official source with confidence MEDIUM or better become suggestions that
  pre-fill the rule (the household still sees, edits and confirms them).
- Every other category is listed by name only. A figure found for one is shown as a dated hint,
  never pre-filled.
- `conflict = YES` rows show a caution on the rule card.
