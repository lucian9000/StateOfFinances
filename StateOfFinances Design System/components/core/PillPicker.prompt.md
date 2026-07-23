Horizontal scrollable pill row for time range selection — Daily / Weekly / Monthly / Yearly.

```jsx
<PillPicker defaultActive="Monthly" onChange={(v) => console.log(v)} />
<PillPicker options={["7d","30d","90d","1y"]} defaultActive="30d" />
```

Maintains internal state; sync via `onChange`. Active pill: `--violet`. Overflow scrolls horizontally on narrow viewports.
