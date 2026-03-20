

## Fix: Import header detection picks up banner row instead of real headers

### Problem
The `findHeaderRow` function in `EventsImportDialog.tsx` finds the first row matching a keyword. A merged-cell banner like "Расписание праздников" matches "праздник" and gets selected as the header row. Since merged cells repeat the same value across columns, ALL headers become "Расписание праздников", breaking column mapping.

### Solution

Two changes in `EventsImportDialog.tsx`:

**1. Skip banner rows in `findHeaderRow`**
Add a check: if all non-empty cells in a row have the **same value**, it's a banner/title row -- skip it. Real header rows have diverse column names.

```ts
// Inside findHeaderRow, after checking keyword hit:
const uniqueValues = new Set(nonEmpty.map(c => c.toLowerCase()));
if (uniqueValues.size < 2 && nonEmpty.length > 1) continue; // banner row
```

**2. Deduplicate headers**
If duplicate header names still slip through, append a suffix (`_2`, `_3`, etc.) so they don't collapse as object keys:

```ts
// After finding headers, deduplicate:
const seen = new Map<string, number>();
const uniqueHeaders = headers.map(h => {
  const count = seen.get(h) || 0;
  seen.set(h, count + 1);
  return count > 0 ? `${h}_${count + 1}` : h;
});
```

### Files
- **Edit**: `src/components/EventsImportDialog.tsx` -- `findHeaderRow` function (lines 80-97) + header dedup after detection

