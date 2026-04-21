import s from './UI.module.css';
export function Button({children,variant='teal',size='md',fullWidth=false,loading=false,disabled=false,onClick,type='button',style,className='',...r}){
  return(<button type={type} style={style} className={[s.btn,s[`v-${variant}`],s[`s-${size}`],fullWidth?s.full:'',className].join(' ')} disabled={disabled||loading} onClick={onClick} {...r}>
    {loading&&<span className={s.spin}/>}{children}</button>);}
export function Input({label,required,hint,error,mono=false,readOnly=false,className='',style,...p}){
  return(<div className={s.fw} style={style}>
    {label&&<label className={s.lbl}>{label}{required&&<span className={s.req}>*</span>}</label>}
    <input className={[s.inp,mono?s.mono:'',readOnly?s.ro:'',error?s.iErr:'',className].join(' ')} readOnly={readOnly} {...p}/>
    {hint&&!error&&<p className={s.hint}>{hint}</p>}{error&&<p className={s.emsg}>{error}</p>}</div>);}
export function Select({label,required,hint,error,children,className='',...p}){
  return(<div className={s.fw}>
    {label&&<label className={s.lbl}>{label}{required&&<span className={s.req}>*</span>}</label>}
    <select className={[s.sel,error?s.iErr:'',className].join(' ')} {...p}>{children}</select>
    {hint&&!error&&<p className={s.hint}>{hint}</p>}{error&&<p className={s.emsg}>{error}</p>}</div>);}
const AICO={info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'};
export function Alert({type='info',children,className='',style}){
  return(<div className={[s.alert,s[`a-${type}`],className].join(' ')} style={style} role="alert">
    <span aria-hidden>{AICO[type]}</span><div>{children}</div></div>);}
export function Tag({children,color='teal',className=''}){return <span className={[s.tag,s[`tg-${color}`],className].join(' ')}>{children}</span>;}
export function Chip({children,color='green'}){return <span className={[s.chip,s[`ch-${color}`]].join(' ')}>{children}</span>;}
export function Toggle({checked,onChange,disabled=false}){
  return(
    <button type="button" role="switch" aria-checked={checked} disabled={disabled}
      className={[s.toggle,checked?s.ton:''].join(' ')} onClick={()=>onChange(!checked)}>
      <span className={s.tTxt}>{checked ? 'SI' : 'NO'}</span>
    </button>
  );
}

export function Checkbox({label,subLabel,checked,onChange}){
  return(<div className={[s.chkW,checked?s.chkWon:''].join(' ')} onClick={()=>onChange(!checked)}
    role="checkbox" aria-checked={checked} tabIndex={0} onKeyDown={e=>e.key===' '&&onChange(!checked)}>
    <span className={[s.chkB,checked?s.chkBon:''].join(' ')} aria-hidden/>
    <div><div className={s.chkL}>{label}</div>{subLabel&&<div className={s.chkS}>{subLabel}</div>}</div></div>);}
export function MiniCheck({checked,onChange}){
  return(<span className={[s.mchk,checked?s.mchkon:''].join(' ')}
    onClick={e=>{e.stopPropagation();onChange(!checked);}} role="checkbox" aria-checked={checked} tabIndex={0}/>);}
export function Spinner({size='md'}){return <span className={[s.spin,s[`spin-${size}`]].join(' ')} aria-label="Cargando"/>;}
export function Divider(){return <hr className={s.div}/>;}
export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  if (!isOpen) return null;
  return (
    <div className={s.mOver} onClick={onClose}>
      <div className={[s.mCont, s[`m-${size}`]].join(' ')} onClick={e => e.stopPropagation()}>
        <div className={s.mHdr}>
          <div className={s.mTtl}>{title}</div>
          <button className={s.mCls} onClick={onClose}>✕</button>
        </div>
        <div className={s.mBody}>{children}</div>
        {footer && <div className={s.mFtr}>{footer}</div>}
      </div>
    </div>
  );
}

