Base surface container. Use `hero` for the balance card, `raised` for elevated sections, `default` for list items and nav rows.

```jsx
<Card variant="default"><p>List item content</p></Card>
<Card variant="hero"><p>Balance hero</p></Card>
<Card variant="raised" padding="12px 16px"><p>Compact item</p></Card>
```

All three variants share `--radius-card` (24px). The `hero` variant applies `--gradient-hero` background and `--shadow-card` (violet-tinted).
