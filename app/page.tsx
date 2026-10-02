'use client';

import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { type DestinationId } from '@/lib/destinations';
import { appDestinationFromSearch } from '@/lib/app-destination';
import ScreenMode, { useScreenMode } from './screen-mode';

const Explorer=lazy(()=>import('./explorer'));
const waiting=<div className="initial-loading" role="status">금성관 산책을 준비하고 있습니다</div>;

export default function Home() {
  return <ScreenMode><DestinationApp/></ScreenMode>;
}

function DestinationApp() {
  const [selected,setSelected]=useState<DestinationId|null>(null);
  const [opened,setOpened]=useState(false);
  const { initialized,portrait }=useScreenMode();
  useEffect(()=>{
    setSelected(appDestinationFromSearch(window.location.search));
    const url=new URL(window.location.href);
    if(url.searchParams.has('place')){url.searchParams.delete('place');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}
  },[]);
  useEffect(()=>{if(initialized&&!portrait)setOpened(true);},[initialized,portrait]);
  // Mount once after a usable orientation; later rotations keep the scene and position.
  if(!initialized||!selected||!opened)return waiting;
  return <SceneCodeBoundary><Suspense fallback={waiting}><Explorer/></Suspense></SceneCodeBoundary>;
}

class SceneCodeBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed)return <section className="scene-recovery" role="alert"><strong>산책 화면을 열지 못했습니다</strong><p>연결을 확인한 뒤 다시 열어 주세요.</p><button onClick={()=>window.location.reload()}>다시 열기</button></section>;
    return this.props.children;
  }
}
