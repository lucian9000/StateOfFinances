Pill-shaped text input — matches the search bar on the Transactions page.

```jsx
<Input placeholder="Search transactions…" leadingSlot={<SearchIcon size={16} />} />
<Input type="text" placeholder="R 0.00" />
```

Pass a 16px Lucide icon as `leadingSlot` for the search pattern. No border, no focus ring by default — inherits `--surface` background. Add `input:focus { outline: 2px solid var(--violet); }` if a focus ring is needed.
