import React, {useState} from 'react';

export function PillPicker({
  options=['Daily','Weekly','Monthly','Yearly'],
  defaultActive='Monthly',
  onChange,
}) {
  const [active, setActive] = useState(defaultActive);
  const select = (opt) => { setActive(opt); onChange && onChange(opt); };
  return (
    <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:2}}>
      {options.map(opt => (
        <button key={opt} onClick={() => select(opt)} style={{
          flexShrink:0, borderRadius:'var(--radius-full)', padding:'6px 16px',
          border:'none', cursor:'pointer',
          fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontWeight:500,
          transition:'background var(--transition-fast), color var(--transition-fast)',
          background: active===opt ? 'var(--violet)' : 'var(--surface)',
          color:       active===opt ? 'var(--text)'   : 'var(--text-muted)',
        }}>
          {opt}
        </button>
      ))}
    </div>
  );
}
