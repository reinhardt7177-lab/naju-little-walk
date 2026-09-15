'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,MapPin,Compass} from 'lucide-react';
type Pin={id:string;label:string;x:number;y:number};
export default function BitgaramHub(){
  const [pins,setPins]=useState<Pin[]>([]);
  useEffect(()=>{document.title='나주 산책 — 빛가람 장소 선택';const c=new AbortController();fetch('/bitgaram-overview.json',{signal:c.signal}).then(r=>r.json()).then(d=>{const data=d as {pins?:Pin[]};if(Array.isArray(data.pins))setPins(data.pins.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}).catch(()=>{});return()=>c.abort();},[]);
  const places=[{id:'bitgaram-park',title:'호수공원 · 전망대',detail:'전망대 주변 산책과 내부 전망실',n:'01'},{id:'bitgaram-kepco',title:'한국전력 본사',detail:'입구 주변과 1층 로비',n:'02'},{id:'bitgaram-kentech',title:'KENTECH',detail:'완공 건물 입구와 1층 추정 초안',n:'03'}];
  return <main className="bitgaram-hub">
    <header><a href="/?place=geumseonggwan"><Compass size={26}/>나주 산책</a><span>빛가람 · 장소별 산책</span></header>
    <div className="hub-layout"><section className="hub-map" aria-label="빛가람 조감 안내 지도">
      <div className="hub-map-image"><img src="/bitgaram-overview.png" alt="실제 지도 윤곽을 바탕으로 렌더링한 빛가람 호수공원과 주변 건물"/>{pins.map(p=><a className="hub-pin" key={p.id} href={`/?place=${p.id}`} style={{left:`${p.x}%`,top:`${p.y}%`}}><MapPin size={20}/><strong>{p.label}</strong><ArrowUpRight size={18}/></a>)}</div>
      <span className="hub-north">조감 안내</span><p className="hub-map-caption">푯말을 누르면 그 장소의 산책 맵으로 들어갑니다.</p>
    </section><aside className="hub-places"><span className="hub-kicker">BITGARAM</span><h1>어디부터<br/>걸어볼까요?</h1><p>각 장소를 따로 불러와<br/>가까이에서 둘러봅니다.</p>
      {places.map(p=><a className="hub-place" key={p.id} href={`/?place=${p.id}`}><span>{p.n}</span><div><strong>{p.title}</strong><small>{p.detail}</small></div><ArrowUpRight size={20}/></a>)}
      <small className="hub-note">사진·영상 기반 제작 초안입니다. 건물 높이와 내부 치수·배치에는 추정이 포함됩니다.</small>
    </aside></div>
    <footer><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap 기여자 · ODbL</a><span>위성사진·현장 사진 참고 · 조감용 주변 건물은 산책 대상에서 제외</span></footer>
  </main>;
}
