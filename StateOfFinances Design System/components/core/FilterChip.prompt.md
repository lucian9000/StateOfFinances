Category filter chip — used in a horizontal scrollable row on the Transactions page.

```jsx
<div style={{display:'flex', gap:8, overflowX:'auto'}}>
  <FilterChip label="All"       active={true}  onClick={() => {}} />
  <FilterChip label="Groceries" active={false} onClick={() => {}} />
  <FilterChip label="Petrol"    active={false} onClick={() => {}} />
</div>
```

Active: `--violet` fill + `--text`. Inactive: `--surface` fill + `--text-muted`. Always render in `display:flex; gap:8px; overflow-x:auto` container.
