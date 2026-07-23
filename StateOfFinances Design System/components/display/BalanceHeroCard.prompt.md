The primary balance card on the Overview page. Gradient background, large display-font balance, spend/profit in tabular mono.

```jsx
<BalanceHeroCard balance={12450} spend={3200} profit={2800} />
<BalanceHeroCard balance={8000}  spend={5100} profit={-900} />
```

All amounts are ZAR. Negative `profit` renders in `--magenta`; positive in `--cyan`. The production app animates the balance as an odometer on load — substitute `OdometerNumber` for the balance value when building the real dashboard.
