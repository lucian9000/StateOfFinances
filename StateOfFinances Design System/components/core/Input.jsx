import React from 'react';

export function Input({value, onChange, placeholder='Search…', type='text', leadingSlot}) {
  return (
    <div style={{position:'relative', display:'flex', alignItems:'center'}}>
      {leadingSlot && (
        <span style={{
          position:'absolute', left:14, display:'flex', alignItems:'center',
          color:'var(--text-muted)', pointerEvents:'none',
        }}>
          {leadingSlot}
        </span>
      )}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width:'100%', background:'var(--surface)', border:'none', outline:'none',
          borderRadius:'var(--radius-full)',
          padding: leadingSlot ? '9px 16px 9px 40px' : '9px 16px',
          color:'var(--text)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)',
        }}
      />
    </div>
  );
}
