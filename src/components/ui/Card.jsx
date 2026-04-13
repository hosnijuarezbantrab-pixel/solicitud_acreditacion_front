import s from './Card.module.css';
export function Card({children,className='',style}){return<div className={[s.card,className].join(' ')} style={style}>{children}</div>;}
export function CardHeader({title,subtitle,actions}){return(<div className={s.hdr}><div><div className={s.ttl}>{title}</div>{subtitle&&<div className={s.sub}>{subtitle}</div>}</div>{actions&&<div className={s.act}>{actions}</div>}</div>);}
export function CardBody({children,className=''}){return<div className={[s.body,className].join(' ')}>{children}</div>;}
export function SectionTitle({children,icon}){return(<div className={s.st}><span className={s.bar}/>{icon&&<span aria-hidden>{icon}</span>}{children}</div>);}
export function FieldRow({cols=2,children,style}){return<div className={[s.row,s[`c${cols}`]].join(' ')} style={style}>{children}</div>;}
export function StatCard({label,value,color='teal',accent}){return(<div className={s.stat} style={{'--ac':accent||`var(--${color})`}}><div className={s.slbl}>{label}</div><div className={[s.sval,s[`sc-${color}`]].join(' ')}>{value}</div></div>);}
