import React from 'react';

const sizeMap = {
  sm: {fontSize:'0.75rem',  padding:'5px 12px'},
  md: {fontSize:'0.875rem', padding:'7px 16px'},
  lg: {fontSize:'1rem',     padding:'10px 22px'},
};
const variantMap = {
  primary:   {background:'var(--violet)',                      color:'var(--text)'},
  secondary: {background:'var(--surface-raised)',              color:'var(--text)'},
  ghost:     {background:'transparent',                        color:'var(--text-muted)'},
  danger:    {background:'rgb(230 79 204 / 0.15)',             color:'var(--magenta)'},
  income:    {background:'rgb(34 211 238 / 0.15)',             color:'var(--cyan)'},
};

export function Button({
  children, variant='primary', size='md',
  disabled=false, onClick, type='button', fullWidth=false,
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
      borderRadius:'var(--radius-full)', border:'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily:'var(--font-body)', fontWeight:500,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      transition:'background var(--transition-fast), color var(--transition-fast)',
      whiteSpace:'nowrap',
      ...sizeMap[size], ...variantMap[variant],
    }}>
      {children}
    </button>
  );
}
