import React from 'react';

export function GoalCard({name='Cape Town Trip', icon='✈', targetAmount=15000, currentAmount=4500}) {
  const pct = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      borderRadius:'var(--radius-card)', background:'var(--surface)', padding:'12px 16px',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <span style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:36, height:36, borderRadius:'50%',
          background:'var(--amber-20)', color:'var(--amber)', fontSize:'1rem',
        }}>
          {icon}
        </span>
        <div>
          <p style={{margin:0, fontSize:'var(--text-sm)', fontWeight:500, color:'var(--text)', fontFamily:'var(--font-body)'}}>{name}</p>
          <p style={{margin:0, fontSize:'var(--text-xs)', color:'var(--text-muted)', fontFamily:'var(--font-body)'}}>
            Goal R {targetAmount.toLocaleString('en-ZA')}
          </p>
        </div>
      </div>
      <span style={{fontFamily:'var(--font-mono)', fontSize:'var(--text-sm)', fontWeight:600, color:'var(--amber)', fontVariantNumeric:'tabular-nums'}}>{pct}%</span>
    </div>
  );
}
