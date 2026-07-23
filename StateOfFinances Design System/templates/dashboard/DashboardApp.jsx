// StateOfFinances Dashboard — React app, mounted by Dashboard.dc.html via x-import
// Requires: window.lucide (lucide UMD), window.React

const dashC = {
  bg:'#120e1f', surface:'#1e1830', surfaceRaised:'#28203f',
  violet:'#8b5cf6', magenta:'#e64fcc', cyan:'#22d3ee', amber:'#f5a623',
  text:'#f5f3fa', muted:'#9c93b5',
  palette:['#8b5cf6','#e64fcc','#22d3ee','#f5a623'],
  m20:'rgb(230 79 204/0.20)', c20:'rgb(34 211 238/0.20)', a20:'rgb(245 166 35/0.20)',
};
const dashF = {
  display:"'Space Grotesk',sans-serif",
  body:"'Inter',sans-serif",
  mono:"'JetBrains Mono',monospace"
};

// ── Lucide icon paths (from lucide.dev) ───────────────────────────────────────
const DASH_ICONS = {
  'search':        [['circle',{cx:'11',cy:'11',r:'8'}],['path',{d:'m21 21-4.3-4.3'}]],
  'chevron-left':  [['path',{d:'m15 18-6-6 6-6'}]],
  'chevron-right': [['path',{d:'m9 18 6-6-6-6'}]],
  'trending-down': [['polyline',{points:'22 17 13.5 8.5 8.5 13.5 2 7'}],['polyline',{points:'16 17 22 17 22 11'}]],
  'trending-up':   [['polyline',{points:'22 7 13.5 15.5 8.5 10.5 2 17'}],['polyline',{points:'16 7 22 7 22 13'}]],
  'plane':         [['path',{d:'M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-1 1-.1.6.1 1.2.5 1.6l3.9 3.9 2.5 2.5c.4.4.4 1 0 1.4L5.5 17.5c-.5.5-.5 1.3 0 1.8s1.3.5 1.8 0l2.2-2.2c.4-.4 1-.4 1.4 0l3.9 3.9c.4.4 1 .6 1.6.5.6-.1 1-.5 1-1z'}]],
  'monitor':       [['rect',{width:'20',height:'14',x:'2',y:'3',rx:'2'}],['path',{d:'M8 21h8'}],['path',{d:'M12 17v4'}]],
};
function Icon({ name, size=20, color='currentColor', strokeWidth=1.5, style }) {
  const nodes = DASH_ICONS[name];
  if (!nodes) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {nodes.map(([tag, attrs], i) => React.createElement(tag, {...attrs, key: i}))}
    </svg>
  );
}

// ── Design-system components (inline copies) ──────────────────────────────────
function Badge({label='?', colorIndex=0, size='md', shape='circle'}) {
  const sz = {sm:{w:28,h:28,fs:'.6875rem'}, md:{w:36,h:36,fs:'.875rem'}, lg:{w:48,h:48,fs:'1rem'}}[size] || {w:36,h:36,fs:'.875rem'};
  return (
    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,
      width:sz.w,height:sz.h,borderRadius:shape==='rounded'?'16px':'9999px',
      background:dashC.palette[colorIndex%4],color:dashC.bg,
      fontWeight:600,fontFamily:dashF.display,fontSize:sz.fs}}>
      {String(label).charAt(0).toUpperCase()}
    </span>
  );
}

function FilterChip({label, active=false, onClick}) {
  return (
    <button onClick={onClick} style={{flexShrink:0,borderRadius:'9999px',padding:'5px 14px',border:'none',
      fontFamily:dashF.body,fontSize:'.875rem',fontWeight:500,cursor:'pointer',
      transition:'background 150ms ease',whiteSpace:'nowrap',
      background:active?dashC.violet:dashC.surface,color:active?dashC.text:dashC.muted}}>
      {label}
    </button>
  );
}

function Input({value, onChange, placeholder='Search…'}) {
  return (
    <div style={{position:'relative',display:'flex',alignItems:'center'}}>
      <span style={{position:'absolute',left:14,display:'flex',alignItems:'center',pointerEvents:'none'}}>
        <Icon name="search" size={14} color={dashC.muted}/>
      </span>
      <input type="text" value={value} onChange={onChange} placeholder={placeholder}
        style={{width:'100%',background:dashC.surface,border:'none',outline:'none',
          borderRadius:'9999px',padding:'9px 16px 9px 38px',
          color:dashC.text,fontFamily:dashF.body,fontSize:'.875rem'}}/>
    </div>
  );
}

function PillPicker({options, defaultActive='Monthly', onChange}) {
  const opts = options || ['Daily','Weekly','Monthly','Yearly'];
  const [active, setActive] = React.useState(defaultActive);
  return (
    <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:2}}>
      {opts.map(opt => (
        <button key={opt} onClick={() => { setActive(opt); onChange && onChange(opt); }}
          style={{flexShrink:0,borderRadius:'9999px',padding:'6px 16px',border:'none',cursor:'pointer',
            fontFamily:dashF.body,fontSize:'.875rem',fontWeight:500,transition:'background 150ms ease',
            background:active===opt?dashC.violet:dashC.surface,color:active===opt?dashC.text:dashC.muted}}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function BalanceHeroCard({balance=12450, spend=3200, profit=2800}) {
  const fmt = n => `R ${Math.abs(n).toLocaleString('en-ZA')}`;
  return (
    <div style={{borderRadius:24,padding:24,
      background:'linear-gradient(135deg,#28203f 0%,rgb(139 92 246/0.20) 100%)',
      boxShadow:'0 10px 15px -3px rgb(139 92 246/0.10)'}}>
      <p style={{margin:0,fontSize:'.875rem',color:dashC.muted,fontFamily:dashF.body}}>My Balance</p>
      <p style={{margin:'4px 0 0',fontFamily:dashF.display,fontSize:'2.25rem',fontWeight:600,
        fontVariantNumeric:'tabular-nums',color:dashC.text}}>
        <span style={{color:dashC.muted}}>R </span>{Math.abs(balance).toLocaleString('en-ZA')}
      </p>
      <div style={{display:'flex',gap:24,marginTop:24}}>
        {[
          {icon:'trending-down', label:'Spend',  val:fmt(spend),  bg:dashC.m20, col:dashC.magenta},
          {icon:'trending-up',   label:'Income', val:(profit>=0?'+ ':'-  ')+fmt(profit), bg:dashC.c20, col:profit>=0?dashC.cyan:dashC.magenta},
        ].map(s => (
          <div key={s.label} style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{display:'flex',alignItems:'center',justifyContent:'center',
              width:32,height:32,borderRadius:'50%',background:s.bg}}>
              <Icon name={s.icon} size={16} color={s.col}/>
            </span>
            <div>
              <p style={{margin:0,fontSize:'.75rem',color:dashC.muted,fontFamily:dashF.body}}>{s.label}</p>
              <p style={{margin:0,fontFamily:dashF.mono,fontSize:'.875rem',fontWeight:500,
                color:s.col,fontVariantNumeric:'tabular-nums'}}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalCard({name='Goal', iconName='star', targetAmount=10000, currentAmount=3000}) {
  const pct = targetAmount > 0 ? Math.min(100, Math.round((currentAmount/targetAmount)*100)) : 0;
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
      borderRadius:24,background:dashC.surface,padding:'12px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{display:'flex',alignItems:'center',justifyContent:'center',
          width:36,height:36,borderRadius:'50%',background:dashC.a20}}>
          <Icon name={iconName} size={16} color={dashC.amber}/>
        </span>
        <div>
          <p style={{margin:0,fontSize:'.875rem',fontWeight:500,color:dashC.text,fontFamily:dashF.body}}>{name}</p>
          <p style={{margin:0,fontSize:'.75rem',color:dashC.muted,fontFamily:dashF.body}}>
            Goal R {targetAmount.toLocaleString('en-ZA')}
          </p>
        </div>
      </div>
      <span style={{fontFamily:dashF.mono,fontSize:'.875rem',fontWeight:600,
        color:dashC.amber,fontVariantNumeric:'tabular-nums'}}>{pct}%</span>
    </div>
  );
}

function TransactionRow({categoryName='Groceries', note, amount=450, colorIndex=0}) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderRadius:24,padding:'8px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{display:'flex',alignItems:'center',justifyContent:'center',
          width:36,height:36,borderRadius:'50%',flexShrink:0,
          background:dashC.palette[colorIndex%4],color:dashC.bg,
          fontWeight:600,fontFamily:dashF.display,fontSize:'.875rem'}}>
          {categoryName.charAt(0).toUpperCase()}
        </span>
        <div>
          <p style={{margin:0,fontSize:'.875rem',fontWeight:500,color:dashC.text,fontFamily:dashF.body}}>{categoryName}</p>
          {note && <p style={{margin:0,fontSize:'.75rem',color:dashC.muted,fontFamily:dashF.body,
            maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{note}</p>}
        </div>
      </div>
      <p style={{margin:0,fontFamily:dashF.mono,fontSize:'.875rem',fontWeight:500,
        color:dashC.magenta,fontVariantNumeric:'tabular-nums'}}>
        - R {Math.abs(amount).toLocaleString('en-ZA')}
      </p>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CATS = [
  {name:'Groceries',amount:3200},
  {name:'Petrol',   amount:1800},
  {name:'Subs',     amount:450},
  {name:'Rent',     amount:12000},
];
const GROUPS = [
  {label:'Tuesday, 22 July', rows:[
    {categoryName:'Groceries',    amount:450,  colorIndex:0, note:'checkers green point'},
    {categoryName:'Petrol',       amount:800,  colorIndex:1},
    {categoryName:'Subscriptions',amount:199,  colorIndex:2, note:'Netflix'},
  ]},
  {label:'Monday, 21 July', rows:[
    {categoryName:'Groceries',amount:320,  colorIndex:0, note:'woolworths food'},
    {categoryName:'Rent',     amount:12000,colorIndex:3},
  ]},
  {label:'Friday, 18 July', rows:[
    {categoryName:'Petrol',       amount:900,colorIndex:1, note:'engen malmesbury'},
    {categoryName:'Subscriptions',amount:99, colorIndex:2, note:'Suno AI'},
  ]},
];
const GOALS = [
  {name:'Cape Town Trip',iconName:'plane',  targetAmount:15000,currentAmount:4500},
  {name:'New Laptop',    iconName:'monitor',targetAmount:25000,currentAmount:8200},
];

// ── Donut chart ───────────────────────────────────────────────────────────────
function Donut({data}) {
  const CX=80,CY=80,R=62,IR=40;
  const total = data.reduce((s,d)=>s+d.amount,0);
  let angle = -Math.PI/2;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {data.map((d,i)=>{
        const sl = (d.amount/total)*2*Math.PI - .025;
        const x1=CX+R*Math.cos(angle),    y1=CY+R*Math.sin(angle);
        const x2=CX+R*Math.cos(angle+sl), y2=CY+R*Math.sin(angle+sl);
        const xi1=CX+IR*Math.cos(angle),   yi1=CY+IR*Math.sin(angle);
        const xi2=CX+IR*Math.cos(angle+sl),yi2=CY+IR*Math.sin(angle+sl);
        const lg = sl > Math.PI ? 1 : 0;
        const path = `M${x1} ${y1}A${R} ${R} 0 ${lg} 1 ${x2} ${y2}L${xi2} ${yi2}A${IR} ${IR} 0 ${lg} 0 ${xi1} ${yi1}Z`;
        angle += sl + .025;
        return <path key={i} d={path} fill={dashC.palette[i%4]}/>;
      })}
    </svg>
  );
}

// ── Screens ───────────────────────────────────────────────────────────────────
function OverviewPage({onNav}) {
  const [range, setRange] = React.useState('Monthly');
  return (
    <main style={{maxWidth:448,margin:'0 auto',display:'flex',flexDirection:'column',gap:24,padding:'32px 20px 48px'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <p style={{margin:0,fontSize:'.875rem',color:dashC.muted,fontFamily:dashF.body}}>Hello,</p>
          <h1 style={{margin:0,fontFamily:dashF.display,fontSize:'1.25rem',fontWeight:600,color:dashC.text}}>Lucian</h1>
        </div>
        <div style={{width:40,height:40,borderRadius:'50%',background:dashC.surfaceRaised,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:dashF.display,fontWeight:600,fontSize:'.875rem',color:dashC.text}}>L</div>
      </header>

      <div style={{display:'flex',gap:12}}>
        {CATS.map((c,i) => <Badge key={c.name} label={c.name} colorIndex={i} size="lg" shape="rounded"/>)}
      </div>

      <BalanceHeroCard balance={12450} spend={3200} profit={2800}/>

      <PillPicker defaultActive={range} onChange={setRange}/>

      <section>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <h2 style={{margin:0,fontFamily:dashF.display,fontSize:'1.125rem',fontWeight:600,color:dashC.text}}>July 2026</h2>
          <span style={{fontFamily:dashF.mono,fontSize:'.875rem',fontWeight:500,color:dashC.cyan,fontVariantNumeric:'tabular-nums'}}>+ R 2,800</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <Donut data={CATS}/>
          <div style={{width:'100%',display:'flex',flexDirection:'column',gap:2}}>
            {CATS.map((c,i) => (
              <div key={c.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:dashC.palette[i],flexShrink:0}}></span>
                  <span style={{fontFamily:dashF.body,fontSize:'.875rem',color:dashC.text}}>{c.name}</span>
                </div>
                <span style={{fontFamily:dashF.mono,fontSize:'.875rem',color:dashC.muted,fontVariantNumeric:'tabular-nums'}}>R {c.amount.toLocaleString('en-ZA')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <h2 style={{margin:0,fontFamily:dashF.display,fontSize:'1.125rem',fontWeight:600,color:dashC.text}}>Goals</h2>
          <span style={{fontSize:'.875rem',color:dashC.muted,fontFamily:dashF.body,cursor:'pointer'}}>See all</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {GOALS.map(g => <GoalCard key={g.name} {...g}/>)}
        </div>
      </section>

      <button onClick={onNav} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        borderRadius:24,background:dashC.surface,padding:'12px 16px',border:'none',width:'100%',cursor:'pointer'}}>
        <span style={{fontFamily:dashF.body,fontSize:'.875rem',fontWeight:500,color:dashC.muted}}>View all transactions</span>
        <Icon name="chevron-right" size={18} color={dashC.muted}/>
      </button>
    </main>
  );
}

function TransactionsPage({onBack}) {
  const [search, setSearch] = React.useState('');
  const [activeCat, setActiveCat] = React.useState(null);
  const chips = ['All', ...CATS.map(c => c.name)];
  const filtered = GROUPS
    .map(g => ({...g, rows: g.rows.filter(r => {
      const mc = !activeCat || r.categoryName.toLowerCase().startsWith(activeCat.toLowerCase().slice(0,4));
      const ms = !search || r.categoryName.toLowerCase().includes(search.toLowerCase()) || (r.note||'').toLowerCase().includes(search.toLowerCase());
      return mc && ms;
    })}))
    .filter(g => g.rows.length > 0);

  return (
    <main style={{maxWidth:448,margin:'0 auto',display:'flex',flexDirection:'column',gap:24,padding:'32px 20px 48px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:'50%',background:dashC.surface,
          border:'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer'}}>
          <Icon name="chevron-left" size={18} color={dashC.muted}/>
        </button>
        <h1 style={{margin:0,fontFamily:dashF.display,fontSize:'1.25rem',fontWeight:600,color:dashC.text}}>Transactions</h1>
      </div>

      <Input placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)}/>

      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:2}}>
        {chips.map(c => (
          <FilterChip key={c} label={c}
            active={c==='All' ? !activeCat : activeCat===c}
            onClick={() => setActiveCat(c==='All' ? null : c)}/>
        ))}
      </div>

      {filtered.length === 0
        ? <p style={{textAlign:'center',fontSize:'.875rem',color:dashC.muted,marginTop:24}}>No transactions found.</p>
        : filtered.map(g => (
            <div key={g.label}>
              <h3 style={{margin:'0 0 8px',fontSize:'.75rem',fontWeight:500,
                textTransform:'uppercase',letterSpacing:'.08em',color:dashC.muted,fontFamily:dashF.body}}>
                {g.label}
              </h3>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {g.rows.map((r,i) => <TransactionRow key={i} {...r}/>)}
              </div>
            </div>
          ))
      }
    </main>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = React.useState('overview');
  return (
    <div style={{background:dashC.bg,minHeight:'100vh'}}>
      {screen === 'overview'
        ? <OverviewPage onNav={() => setScreen('transactions')}/>
        : <TransactionsPage onBack={() => setScreen('overview')}/>}
    </div>
  );
}

module.exports = { App };
