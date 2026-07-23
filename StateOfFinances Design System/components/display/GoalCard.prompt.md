Savings goal list item — amber icon, name, target amount, and progress percentage.

```jsx
<GoalCard name="Cape Town Trip" icon="✈"  targetAmount={15000} currentAmount={4500} />
<GoalCard name="New Laptop"     icon="💻" targetAmount={25000} currentAmount={25000} />
```

Progress % is auto-calculated, capped at 100%. The production app uses Lucide icons (looked up by `goal.icon` → PascalCase → `import * as Icons from 'lucide-react'`).
