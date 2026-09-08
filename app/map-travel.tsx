'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, X, ArrowUpRight, Footprints } from 'lucide-react';
import { destinations, type DestinationId } from '@/lib/destinations';
import { canTravelTo, mapArrival, mapColor, mapSolids, regionalPoint, regionalSize } from '@/lib/map-navigation';
import { solidCollider, type Point, type World } from '@/lib/world';

type Region = { paths: { id: number; kind: string; name: string; points: Point[] }[]; labels: { name: string; point: Point }[] };
type Props = { destinationId: DestinationId; world: World | null; position: Point; onClose: () => void; onTravel: (point: Point,height?:number) => boolean };

export default function MapTravel({destinationId,world,position,onClose,onTravel}: Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [tab,setTab]=useState<'region'|'local'>('region');
  const [region,setRegion]=useState<Region|null>(null);
  const [mapError,setMapError]=useState('');
  const [notice,setNotice]=useState('');
  const arrivals=useMemo(()=>world?world.places.map(p=>({place:p,point:mapArrival(p,world)})).filter(p=>p.point):[],[world]);
  useEffect(()=>{
    const d=dialog.current!;d.showModal();
    const controller=new AbortController();
    fetch('/naju-region-map.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<Region>;}).then(setRegion).catch(e=>{if(e.name!=='AbortError')setMapError('배경 지도를 불러오지 못했어요. 장소 버튼으로 이동할 수 있어요.');});
    return ()=>{controller.abort();d.close();};
  },[]);
  const travel=(point: Point,height=0)=>{
    if(world && canTravelTo(point,world,height)) {
      // Release the native modal focus trap before focusing the walking canvas.
      dialog.current?.close();
      if(onTravel(point,height)){onClose();return;}
      dialog.current?.showModal();
    }
    setNotice('건물이나 봉분 위에는 이동할 수 없어요. 열린 길을 골라주세요.');
  };
  const span=world?[world.bounds[1]-world.bounds[0],world.bounds[3]-world.bounds[2]]:[1,1];
  return <dialog ref={dialog} className="travel-dialog" aria-labelledby="travel-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="travel-shell">
      <header className="travel-header"><div><span className="travel-eyebrow">NAJU · EXPLORER MAP</span><h2 id="travel-title">어디로 걸어갈까요?</h2></div><button className="map-close" onClick={onClose} aria-label="지도 닫기"><X size={22}/></button></header>
      <div className="travel-tabs" role="tablist" aria-label="지도 범위">
        <button role="tab" id="region-tab" aria-controls="region-panel" aria-selected={tab==='region'} onClick={()=>{setTab('region');setNotice('');}}>나주 전체</button>
        <button role="tab" id="local-tab" aria-controls="local-panel" aria-selected={tab==='local'} onClick={()=>{setTab('local');setNotice('');}} disabled={!world}>{destinations[destinationId].name} 안에서 이동</button>
      </div>
      {tab==='region'?<div id="region-panel" role="tabpanel" aria-labelledby="region-tab" className="travel-content">
        <div className="travel-map regional-map" style={{aspectRatio:`${regionalSize[0]} / ${regionalSize[1]}`}}>
          <svg viewBox={`0 0 ${regionalSize[0]} ${regionalSize[1]}`} aria-label="나주 산책 장소와 영산포의 실제 위치 지도" role="img">
            <rect width="1000" height="694" fill="#e7ebdd"/>
            <defs><pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 H 0 V 50" fill="none" stroke="#566e5310" strokeWidth="1"/></pattern></defs>
            <rect width="1000" height="694" fill="url(#map-grid)"/>
            {region?.paths.filter(p=>p.kind==='river').map(p=><polyline key={p.id} points={p.points.map(p=>regionalPoint(...p).join(',')).join(' ')} fill="none" stroke="#a9cdd0" strokeWidth="19" strokeLinejoin="round" strokeLinecap="round"/>)}
            {region?.paths.filter(p=>p.kind!=='river'&&p.kind!=='rail').map(p=><polyline key={p.id} points={p.points.map(p=>regionalPoint(...p).join(',')).join(' ')} fill="none" stroke="#fffdf5" strokeWidth={p.kind==='trunk'?9:p.kind==='primary'?7:4} strokeLinejoin="round" strokeLinecap="round"/>)}
            {region?.paths.filter(p=>p.kind==='rail').map(p=><polyline key={p.id} points={p.points.map(p=>regionalPoint(...p).join(',')).join(' ')} fill="none" stroke="#9da595" strokeWidth="2" strokeDasharray="4 4"/>)}
            {region?.labels.map((l,i)=>{const p=regionalPoint(...l.point);return <text key={i} x={p[0]} y={p[1]} className="map-village" textAnchor="middle">{l.name}</text>;})}
            <text x="28" y="38" className="map-north">N ↑</text>
            <path d="M 40 646 V 653 H 145 V 646" fill="none" stroke="#607565" strokeWidth="2"/><text x="40" y="678" className="map-village">약 1km</text>
          </svg>
          {(Object.entries(destinations) as [DestinationId,typeof destinations[DestinationId]][]).filter(([,d])=>!('parent' in d)).map(([id,d])=>{const p=regionalPoint(d.coordinates.lon,d.coordinates.lat);return <a className={`region-pin ${id===destinationId?'is-current':''} ${id==='bogam-museum'?'museum-pin':''}`} key={id} href={`/?place=${id}`} aria-current={id===destinationId?'location':undefined} style={{left:`${p[0]/10}%`,top:`${p[1]/regionalSize[1]*100}%`}}><span><MapPin size={22}/></span><strong>{d.name}</strong>{id===destinationId&&<small>현재 장소</small>}</a>;})}
        </div>
        <aside className="travel-list"><p>지도의 장소를 누르면 그곳의 3D 산책으로 이동해요.</p>{(Object.entries(destinations) as [DestinationId,typeof destinations[DestinationId]][]).map(([id,d],i)=><a key={id} href={`/?place=${id}`} className={id===destinationId?'selected-place':''}><span className="travel-index">0{i+1}</span><div><strong>{d.name}</strong><small>{id===destinationId?'지금 둘러보는 곳':'이곳에서 산책 시작'}</small></div><ArrowUpRight size={19}/></a>)}{mapError&&<p role="status">{mapError}</p>}<span className="travel-attribution">© OpenStreetMap 기여자 · ODbL 1.0<br/>주요 도로·하천을 표시한 간략 지도</span></aside>
      </div>:world&&<div id="local-panel" role="tabpanel" aria-labelledby="local-tab" className="travel-content">
        <div className="travel-map local-travel-map" style={{aspectRatio:`${span[0]} / ${span[1]}`}}>
          <svg viewBox={`${world.bounds[0]} ${world.bounds[2]} ${span[0]} ${span[1]}`} role="img" aria-label="열린 길을 누르거나 옆의 장소 목록을 선택해 이동" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();travel([world.bounds[0]+(e.clientX-rect.left)/rect.width*span[0],world.bounds[2]+(e.clientY-rect.top)/rect.height*span[1]]);}}>
            <rect x={world.bounds[0]} y={world.bounds[2]} width={span[0]} height={span[1]} fill="#e2e8d8"/>
            {mapSolids(world).map((s,i)=><polygon key={i} points={solidCollider(s).map(p=>p.join(',')).join(' ')} fill={mapColor(s.name)} stroke="#9da992" strokeWidth=".35"/>)}
            <circle cx={position[0]} cy={position[1]} r={span[0]*.008} fill="#cc6c3a" stroke="#fff" strokeWidth={span[0]*.003}/>
          </svg>
          {arrivals.map(({place,point},i)=><button key={place.id} className="local-pin" style={{left:`${(point![0]-world.bounds[0])/span[0]*100}%`,top:`${(point![1]-world.bounds[2])/span[1]*100}%`}} onClick={()=>travel(point!,place.arrivalHeight)} aria-label={`${place.name}로 이동`} title={place.name}>{i+1}</button>)}
          <span className="local-north">{'parent' in destinations[destinationId]?'출구 ↓':'N ↑'}</span>
        </div>
        <aside className="travel-list"><p>열린 길이나 번호를 누르면 바로 이동해요. 전시관 입구 안으로 걸어가면 실내가 열립니다. 층이 다른 장소는 목록에서 선택하세요.</p>{arrivals.map(({place,point},i)=><button key={place.id} onClick={()=>travel(point!,place.arrivalHeight)}><span className="travel-index">{i+1}</span><div><strong>{place.name}</strong><small>{place.arrivalHeight?(place.arrivalHeight<0?'강변 아래 데크':'상부 관람 공간'):place.indoor?'실내 체험':'이 지점으로 이동'}</small></div><Footprints size={17}/></button>)}{notice&&<p className="map-notice" role="status">{notice}</p>}</aside>
      </div>}
    </div>
  </dialog>;
}
