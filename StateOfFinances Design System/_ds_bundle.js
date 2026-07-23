/* @ds-bundle: {"format":4,"namespace":"StateOfFinancesDesignSystem_135bac","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"FilterChip","sourcePath":"components/core/FilterChip.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"PillPicker","sourcePath":"components/core/PillPicker.jsx"},{"name":"BalanceHeroCard","sourcePath":"components/display/BalanceHeroCard.jsx"},{"name":"GoalCard","sourcePath":"components/display/GoalCard.jsx"},{"name":"TransactionRow","sourcePath":"components/display/TransactionRow.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"d62d854ae45d","components/core/Button.jsx":"cfd2e46a86ae","components/core/Card.jsx":"7101f82fc35c","components/core/FilterChip.jsx":"f4824445f92a","components/core/Input.jsx":"7bbb46e770b0","components/core/PillPicker.jsx":"705462321c53","components/display/BalanceHeroCard.jsx":"a765b763a126","components/display/GoalCard.jsx":"2e2c1fabe2d7","components/display/TransactionRow.jsx":"6491fb09c3b5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.StateOfFinancesDesignSystem_135bac = window.StateOfFinancesDesignSystem_135bac || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
const PALETTE = ['var(--category-0)', 'var(--category-1)', 'var(--category-2)', 'var(--category-3)'];
function Badge({
  label = '?',
  colorIndex = 0,
  size = 'md',
  shape = 'circle'
}) {
  const sizes = {
    sm: {
      w: 28,
      h: 28,
      font: '0.6875rem'
    },
    md: {
      w: 36,
      h: 36,
      font: '0.875rem'
    },
    lg: {
      w: 48,
      h: 48,
      font: '1rem'
    }
  };
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: s.w,
      height: s.h,
      borderRadius: shape === 'rounded' ? 'var(--radius-lg)' : 'var(--radius-full)',
      background: PALETTE[colorIndex % 4],
      color: 'var(--bg)',
      fontWeight: 600,
      fontFamily: 'var(--font-display)',
      fontSize: s.font
    }
  }, String(label).charAt(0).toUpperCase());
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const sizeMap = {
  sm: {
    fontSize: '0.75rem',
    padding: '5px 12px'
  },
  md: {
    fontSize: '0.875rem',
    padding: '7px 16px'
  },
  lg: {
    fontSize: '1rem',
    padding: '10px 22px'
  }
};
const variantMap = {
  primary: {
    background: 'var(--violet)',
    color: 'var(--text)'
  },
  secondary: {
    background: 'var(--surface-raised)',
    color: 'var(--text)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)'
  },
  danger: {
    background: 'rgb(230 79 204 / 0.15)',
    color: 'var(--magenta)'
  },
  income: {
    background: 'rgb(34 211 238 / 0.15)',
    color: 'var(--cyan)'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  fullWidth = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 'var(--radius-full)',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      transition: 'background var(--transition-fast), color var(--transition-fast)',
      whiteSpace: 'nowrap',
      ...sizeMap[size],
      ...variantMap[variant]
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
const bgMap = {
  default: 'var(--surface)',
  raised: 'var(--surface-raised)',
  hero: 'var(--gradient-hero)'
};
function Card({
  children,
  variant = 'default',
  padding = 'var(--card-padding)'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-card)',
      padding,
      background: bgMap[variant] || 'var(--surface)',
      boxShadow: variant === 'hero' ? 'var(--shadow-card)' : undefined
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/FilterChip.jsx
try { (() => {
function FilterChip({
  label,
  active = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      flexShrink: 0,
      borderRadius: 'var(--radius-full)',
      padding: '5px 14px',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      transition: 'background var(--transition-fast), color var(--transition-fast)',
      background: active ? 'var(--violet)' : 'var(--surface)',
      color: active ? 'var(--text)' : 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, label);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function Input({
  value,
  onChange,
  placeholder = 'Search…',
  type = 'text',
  leadingSlot
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, leadingSlot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--text-muted)',
      pointerEvents: 'none'
    }
  }, leadingSlot), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    style: {
      width: '100%',
      background: 'var(--surface)',
      border: 'none',
      outline: 'none',
      borderRadius: 'var(--radius-full)',
      padding: leadingSlot ? '9px 16px 9px 40px' : '9px 16px',
      color: 'var(--text)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)'
    }
  }));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/PillPicker.jsx
try { (() => {
const {
  useState
} = React;
function PillPicker({
  options = ['Daily', 'Weekly', 'Monthly', 'Yearly'],
  defaultActive = 'Monthly',
  onChange
}) {
  const [active, setActive] = useState(defaultActive);
  const select = opt => {
    setActive(opt);
    onChange && onChange(opt);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 2
    }
  }, options.map(opt => /*#__PURE__*/React.createElement("button", {
    key: opt,
    onClick: () => select(opt),
    style: {
      flexShrink: 0,
      borderRadius: 'var(--radius-full)',
      padding: '6px 16px',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      transition: 'background var(--transition-fast), color var(--transition-fast)',
      background: active === opt ? 'var(--violet)' : 'var(--surface)',
      color: active === opt ? 'var(--text)' : 'var(--text-muted)'
    }
  }, opt)));
}
Object.assign(__ds_scope, { PillPicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PillPicker.jsx", error: String((e && e.message) || e) }); }

// components/display/BalanceHeroCard.jsx
try { (() => {
function fmtR(n) {
  return `R ${Math.abs(n).toLocaleString('en-ZA')}`;
}
function BalanceHeroCard({
  balance = 12450,
  spend = 3200,
  profit = 2800
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-card)',
      padding: 'var(--card-padding)',
      background: 'linear-gradient(135deg, var(--surface-raised) 0%, rgb(139 92 246 / 0.20) 100%)',
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)'
    }
  }, "My Balance"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-4xl)',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "R "), Math.abs(balance).toLocaleString('en-ZA')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--magenta-20)',
      color: 'var(--magenta)',
      fontSize: '1.1rem'
    }
  }, "\u2193"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)'
    }
  }, "Spend"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      color: 'var(--magenta)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmtR(spend)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--cyan-20)',
      color: 'var(--cyan)',
      fontSize: '1.1rem'
    }
  }, "\u2191"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)'
    }
  }, "Profit"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      color: profit >= 0 ? 'var(--cyan)' : 'var(--magenta)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, profit >= 0 ? '+' : '-', " ", fmtR(profit))))));
}
Object.assign(__ds_scope, { BalanceHeroCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/BalanceHeroCard.jsx", error: String((e && e.message) || e) }); }

// components/display/GoalCard.jsx
try { (() => {
function GoalCard({
  name = 'Cape Town Trip',
  icon = '✈',
  targetAmount = 15000,
  currentAmount = 4500
}) {
  const pct = targetAmount > 0 ? Math.min(100, Math.round(currentAmount / targetAmount * 100)) : 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)',
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'var(--amber-20)',
      color: 'var(--amber)',
      fontSize: '1rem'
    }
  }, icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      color: 'var(--text)',
      fontFamily: 'var(--font-body)'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)'
    }
  }, "Goal R ", targetAmount.toLocaleString('en-ZA')))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--amber)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, pct, "%"));
}
Object.assign(__ds_scope, { GoalCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/GoalCard.jsx", error: String((e && e.message) || e) }); }

// components/display/TransactionRow.jsx
try { (() => {
const PALETTE = ['var(--category-0)', 'var(--category-1)', 'var(--category-2)', 'var(--category-3)'];
function TransactionRow({
  categoryName = 'Groceries',
  note,
  amount = 450,
  colorIndex = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 'var(--radius-card)',
      padding: '8px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: '50%',
      flexShrink: 0,
      background: PALETTE[colorIndex % 4],
      color: 'var(--bg)',
      fontWeight: 600,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-sm)'
    }
  }, categoryName.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      color: 'var(--text)',
      fontFamily: 'var(--font-body)'
    }
  }, categoryName), note && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)',
      maxWidth: 180,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, note))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      color: 'var(--magenta)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "- R ", Math.abs(amount).toLocaleString('en-ZA')));
}
Object.assign(__ds_scope, { TransactionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/TransactionRow.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.PillPicker = __ds_scope.PillPicker;

__ds_ns.BalanceHeroCard = __ds_scope.BalanceHeroCard;

__ds_ns.GoalCard = __ds_scope.GoalCard;

__ds_ns.TransactionRow = __ds_scope.TransactionRow;

})();
