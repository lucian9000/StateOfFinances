import React from 'react';

const PALETTE = ['var(--category-0)','var(--category-1)','var(--category-2)','var(--category-3)'];

export function TransactionRow({categoryName='Groceries', note, amount=450, colorIndex=0}) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      borderRadius:'var(--radius-card)', padding:'8px 8px',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <span style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:36, height:36, borderRadius:'50%', flexShrink:0,
          background: PALETTE[colorIndex % 4], color:'var(--bg)',
          fontWeight:600, fontFamily:'var(--font-display)', fontSize:'var(--text-sm)',
        }}>
          {categoryName.charAt(0).toUpperCase()}
        </span>
        <div>
          <p style={{margin:0, fontSize:'var(--text-sm)', fontWeight:500, color:'var(--text)', fontFamily:'var(--font-body)'}}>{categoryName}</p>
          {note && (
            <p style={{margin:0, fontSize:'var(--text-xs)', color:'var(--text-muted)', fontFamily:'var(--font-body)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{note}</p>
          )}
        </div>
      </div>
      <p style={{margin:0, fontFamily:'var(--font-mono)', fontSize:'var(--text-sm)', fontWeight:500, color:'var(--magenta)', fontVariantNumeric:'tabular-nums'}}>
        - R {Math.abs(amount).toLocaleString('en-ZA')}
      </p>
    </div>
  );
}
