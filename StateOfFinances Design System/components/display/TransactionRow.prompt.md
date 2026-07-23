Single ledger row — category-colored initial badge, name, optional note, and magenta mono amount.

```jsx
<TransactionRow categoryName="Groceries"     amount={450}   colorIndex={0} note="checkers green point" />
<TransactionRow categoryName="Petrol"        amount={800}   colorIndex={1} />
<TransactionRow categoryName="Subscriptions" amount={199}   colorIndex={2} note="Netflix" />
```

`colorIndex` maps to the category's position in the sorted list, cycling the 4-color palette. Amounts are always shown as negative spend. Group rows by date with a section header: `font-size: --text-xs; text-transform: uppercase; letter-spacing: wide; color: --text-muted`.
