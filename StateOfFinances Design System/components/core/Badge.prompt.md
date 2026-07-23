Category initial badge — the colored circle/square used throughout the dashboard to represent a spending category.

```jsx
<Badge label="Groceries"     colorIndex={0} size="md" shape="circle"  />
<Badge label="Petrol"        colorIndex={1} size="md" shape="circle"  />
<Badge label="Subscriptions" colorIndex={2} size="lg" shape="rounded" />
```

`colorIndex` cycles the 4-color palette: 0=violet, 1=magenta, 2=cyan, 3=amber.  
`shape="rounded"` (radius-lg, 48px) matches the overview page category thumbnails.  
`shape="circle"` (rounded-full, 36px) matches transaction list rows.
