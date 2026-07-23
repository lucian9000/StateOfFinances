import React from 'react';

function fmtR(n) {
  return `R ${Math.abs(n).toLocaleString('en-ZA')}`;
}

export function BalanceHeroCard({balance=12450, spend=3200, profit=2800}) {
  return (
    <div style={{
      borderRadius:'var(--radius-card)', padding:'var(--card-padding)',
      background:'linear-gradient(135deg, var(--surface-raised) 0%, rgb(139 92 246 / 0.20) 100%)',
      boxShadow:'var(--shadow-card)',
    }}>
      <p style={{margin:0, fontSize:'var(--text-sm)', color:'var(--text-muted)', fontFamily:'var(--font-body)'}}>My Balance</p>
      <p style={{margin:'4px 0 0', fontFamily:'var(--font-display)', fontSize:'var(--text-4xl)', fontWeight:600, fontVariantNumeric:'tabular-nums'}}>
        <span style={{color:'var(--text-muted)'}}>R </span>
        {Math.abs(balance).toLocaleString('en-ZA')}
      </p>
      <div style={{display:'flex', gap:24, marginTop:24}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:'50%', background:'var(--magenta-20)', color:'var(--magenta)', fontSize:'1.1rem'}}>↓</span>
          <div>
            <p style={{margin:0, fontSize:'var(--text-xs)', color:'var(--text-muted)', fontFamily:'var(--font-body)'}}>Spend</p>
            <p style={{margin:0, fontFamily:'var(--font-mono)', fontSize:'var(--text-sm)', fontWeight:500, color:'var(--magenta)', fontVariantNumeric:'tabular-nums'}}>{fmtR(spend)}</p>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:'50%', background:'var(--cyan-20)', color:'var(--cyan)', fontSize:'1.1rem'}}>↑</span>
          <div>
            <p style={{margin:0, fontSize:'var(--text-xs)', color:'var(--text-muted)', fontFamily:'var(--font-body)'}}>Profit</p>
            <p style={{margin:0, fontFamily:'var(--font-mono)', fontSize:'var(--text-sm)', fontWeight:500, color: profit>=0 ? 'var(--cyan)' : 'var(--magenta)', fontVariantNumeric:'tabular-nums'}}>
              {profit>=0 ? '+' : '-'} {fmtR(profit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
