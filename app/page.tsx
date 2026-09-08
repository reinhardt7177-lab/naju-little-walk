'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Footprints, MapPin, Map, RotateCcw, Pause, MoveUpRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { movePlayer, moveOnFloors, reachableFloor, worldObstacles, solidCollider, worldFloors, floorHeight, currentPlace, type World } from '@/lib/world';
import { destinations, destinationFromSearch, type DestinationId } from '@/lib/destinations';
import { batchStaticScene } from '@/lib/static-scene';
import { canTravelTo, mapSolids, mapColor } from '@/lib/map-navigation';
import type { Point } from '@/lib/world';
import MapTravel from './map-travel';

type ViewState = { x: number; z: number; yaw: number; place: string; detail: string; indoor: boolean };
type Engine = { start: () => void; pause: () => void; reset: () => void; overview: () => void; key: (key: string, down: boolean) => void; travel: (point: Point, height?:number) => boolean };

export default function Home() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [overview, setOverview] = useState(true);
  const [mapOpen,setMapOpen] = useState(false);
  const [error, setError] = useState('');
  const [destinationId, setDestinationId] = useState<DestinationId>('geumseonggwan');
  const destination = destinations[destinationId];
  const [view, setView] = useState<ViewState>({ x: 0, z: 0, yaw: 0, place: '금성관 주변', detail: '', indoor: false });

  useEffect(() => {
    const selectedId = destinationFromSearch(window.location.search);
    const selected = destinations[selectedId];
    setDestinationId(selectedId);
    document.title = `나주 산책 — ${selected.area}`;
    const mount = host.current!;
    let disposed = false, renderer: THREE.WebGLRenderer | undefined, animation = 0;
    const cleanups: (() => void)[] = [];
    const scene = new THREE.Scene();
    const setup = async () => {
      const response = await fetch(selected.worldUrl);
      if (!response.ok) throw new Error('도시 자료를 불러오지 못했습니다.');
      const data: World = await response.json();
      if (disposed) return;
      setWorld(data);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-label', `${selected.area} 3D 탐험 화면. 마우스를 끌어서 시선을 움직일 수 있습니다.`);
      canvas.tabIndex = 0;
      mount.appendChild(canvas);
      scene.background = new THREE.Color('#bbd9e6');
      scene.fog = new THREE.Fog('#bbd9e6', selectedId !== 'geumseonggwan' ? 650 : 260, selectedId !== 'geumseonggwan' ? 1350 : 690);
      scene.add(new THREE.HemisphereLight('#e1f3ff', '#918673', data.verticalNavigation ? 1.5 : 2.8));
      const sun = new THREE.DirectionalLight('#fff0d1', 3.1);
      sun.position.set(-80, 145, 65); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -165;
      sun.shadow.camera.right = sun.shadow.camera.top = 165;
      sun.shadow.camera.far = 420; sun.shadow.normalBias = 0.06;
      scene.add(sun);
      for (const fixture of data.lights ?? []) {
        const light = new THREE.PointLight(fixture.color, fixture.intensity, fixture.distance, 2);
        light.position.set(...fixture.position);
        scene.add(light);
      }
      const gltf = await new GLTFLoader().loadAsync(selected.modelUrl);
      if (disposed) { gltf.scene.traverse(disposeObject); return; }
      gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = !o.name.startsWith('ground'); o.receiveShadow = true; } });
      batchStaticScene(gltf.scene);
      const roofParts: THREE.Object3D[]=[];
      gltf.scene.traverse(o=>{if(o.userData.hide_in_overview)roofParts.push(o);});
      scene.add(gltf.scene);
      const camera = new THREE.PerspectiveCamera(60, 1, 0.12, selectedId !== 'geumseonggwan' ? 1800 : 1000);
      const colliders = data.solids.filter(s => s.collision).map(solidCollider);
      const floors = worldFloors(data.solids);
      const obstacles=data.verticalNavigation?worldObstacles(data.solids):[];
      let px = data.spawn.x, pz = data.spawn.z, yaw = data.spawn.yaw, pitch = 0;
      let elevation=reachableFloor(px,pz,0,floors)??0;
      let playing = false, bird = true, drag = false, lastX = 0, lastY = 0;
      let orbit: number = selected.overview.angle, orbitElevation: number = selected.overview.elevation, orbitRadius: number = selected.overview.radius;
      const center = selectedId === 'geumseonggwan' ? new THREE.Vector3(data.spawn.x, 0, data.spawn.z - 3) : new THREE.Vector3(selected.overview.center[0], 0, selected.overview.center[1]);
      const keys = new Set<string>();
      const resize = () => {
        if (!renderer) return;
        camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      resize();
      const observer = new ResizeObserver(resize); observer.observe(mount);
      cleanups.push(() => observer.disconnect());
      const listen = (target: EventTarget, name: string, fn: EventListener, options?: AddEventListenerOptions) => {
        target.addEventListener(name, fn, options); cleanups.push(() => target.removeEventListener(name, fn, options));
      };
      const pause = () => {
        playing = false; keys.clear(); drag = false; setActive(false);
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      };
      const start = () => {
        playing = true; bird = false; setActive(true); setStarted(true); setOverview(false);
        canvas.focus({ preventScroll: true });
        // Drag and keyboard controls also work when an embedded browser denies pointer lock.
        if (window.matchMedia('(pointer:fine)').matches && canvas.requestPointerLock) {
          try { const request = canvas.requestPointerLock(); request?.catch(() => {}); } catch { /* drag fallback */ }
        }
      };
      engine.current = {
        start, pause,
        reset: () => { px = data.spawn.x; pz = data.spawn.z; elevation=reachableFloor(px,pz,0,floors)??0; yaw = data.spawn.yaw; pitch = 0; start(); },
        overview: () => { pause(); bird = true; setOverview(true); },
        key: (key, down) => { if (down) keys.add(key); else keys.delete(key); },
        travel: (point,height=0) => {
          if(!canTravelTo(point,data,height))return false;
          px=point[0];pz=point[1];pitch=0;keys.clear();
          elevation=reachableFloor(px,pz,height,floors)??0;
          const arrival=data.places.find(p=>p.arrival && Math.hypot(p.arrival[0]-px,p.arrival[1]-pz)<.1);
          if(arrival && Math.hypot(arrival.position[0]-px,arrival.position[1]-pz)>1)yaw=Math.atan2(px-arrival.position[0],pz-arrival.position[1]);
          start();
          return true;
        },
      };
      const context = (document as Document & { modelContext?: { registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
      if (context?.registerTool) {
        const lifecycle = new AbortController();
        cleanups.push(() => lifecycle.abort());
        const state = () => ({ destination: selected.name, mode: bird ? 'overview' : playing ? 'walking' : 'paused', position: { x: px, z: pz }, source: data.source });
        const registrations = [
          { name: 'get_naju_walk_state', description: 'Read the current Naju exploration view and position.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => state() },
          { name: 'set_naju_walk_view', description: 'Switch the same exploration view as the visible overview, walk, or pause controls.', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: ['overview', 'walk', 'pause'] } }, required: ['view'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => {
            if (!input || typeof input !== 'object' || Object.keys(input).some(k => k !== 'view')) throw new Error('Expected only a view field.');
            const requested = (input as { view?: string }).view;
            if (requested === 'overview') engine.current?.overview(); else if (requested === 'walk') start(); else if (requested === 'pause') pause(); else throw new Error('View must be overview, walk, or pause.');
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); return state();
          } },
        ];
        for (const tool of registrations) {
          try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* optional browser capability */ }
        }
      }
      listen(window, 'keydown', ((e: KeyboardEvent) => {
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        if (e.code === 'Escape') { pause(); return; }
        if (!playing) return;
        if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','ShiftLeft','ShiftRight','Space'].includes(e.code)) { e.preventDefault(); keys.add(e.code); }
      }) as EventListener);
      listen(window, 'keyup', ((e: KeyboardEvent) => { keys.delete(e.code); }) as EventListener);
      listen(window, 'blur', pause);
      listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
      listen(document, 'pointerlockchange', () => { if (document.pointerLockElement !== canvas && playing) pause(); });
      listen(canvas, 'pointerdown', ((e: PointerEvent) => {
        if (!bird && !playing) return;
        drag = true; lastX = e.clientX; lastY = e.clientY;
        if (document.pointerLockElement !== canvas) canvas.setPointerCapture(e.pointerId);
      }) as EventListener);
      listen(window, 'pointerup', () => { drag = false; });
      listen(canvas, 'pointercancel', () => { drag = false; });
      listen(window, 'pointermove', ((e: PointerEvent) => {
        const locked = document.pointerLockElement === canvas;
        if (!locked && !drag) return;
        const dx = locked ? e.movementX : e.clientX - lastX, dy = locked ? e.movementY : e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        if (bird) { orbit -= dx * 0.005; orbitElevation = THREE.MathUtils.clamp(orbitElevation + dy * 0.003, 0.3, 1.3); }
        else if (playing) { yaw -= dx * 0.0028; pitch = THREE.MathUtils.clamp(pitch - dy * 0.0028, -1.15, 1.15); }
      }) as EventListener);
      listen(canvas, 'wheel', ((e: WheelEvent) => { if (bird) { e.preventDefault(); orbitRadius = THREE.MathUtils.clamp(orbitRadius + e.deltaY * 0.1, 85, selectedId !== 'geumseonggwan' ? 800 : 330); } }) as EventListener, { passive: false });
      listen(canvas, 'webglcontextlost', ((e: Event) => { e.preventDefault(); pause(); setError('3D 화면 연결이 끊겼습니다. 새로고침해 다시 열어주세요.'); }) as EventListener);
      setReady(true);
      let last = performance.now(), lastHud = 0;
      const frame = (now: number) => {
        if (disposed || !renderer) return;
        const dt = Math.min((now - last) / 1000, 0.06); last = now;
        if (playing) {
          const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
          const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
          yaw += (Number(keys.has('ArrowLeft') || keys.has('KeyQ')) - Number(keys.has('ArrowRight') || keys.has('KeyE'))) * dt * 1.6;
          const len = Math.hypot(forward, side) || 1;
          const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9 : 4.5) * dt / len;
          const dx=(-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed, dz=(-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed;
          const next=data.verticalNavigation?moveOnFloors(px,pz,elevation,dx,dz,obstacles,floors,data.bounds):movePlayer(px,pz,dx,dz,colliders,data.bounds);
          px = next.x; pz = next.z;
          if('height' in next)elevation=next.height as number;
        }
        roofParts.forEach(o=>{o.visible=!bird;});
        if (bird) {
          camera.position.set(center.x + Math.sin(orbit) * Math.cos(orbitElevation) * orbitRadius, Math.sin(orbitElevation) * orbitRadius, center.z + Math.cos(orbit) * Math.cos(orbitElevation) * orbitRadius); camera.lookAt(center);
        } else { camera.position.set(px, 1.72 + (data.verticalNavigation?elevation:floorHeight(px, pz, floors)), pz); camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yaw, 0); }
        if (now - lastHud > 180) {
          const place = currentPlace(px, pz, data.places, data.verticalNavigation?elevation:undefined);
          setView({ x: px, z: pz, yaw, place: place?.name ?? selected.area, detail: place?.description ?? '길을 따라 천천히 둘러보세요.', indoor: place?.indoor ?? place?.id === 'interior' }); lastHud = now;
        }
        renderer.render(scene, camera); animation = requestAnimationFrame(frame);
      };
      animation = requestAnimationFrame(frame);
    };
    function disposeObject(o: THREE.Object3D) {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry?.dispose(); const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { Object.values(m).forEach(v => { if (v instanceof THREE.Texture) v.dispose(); }); m.dispose(); });
    }
    setup().catch(e => { if (!disposed) setError(e instanceof Error ? e.message : '3D 화면을 열 수 없습니다.'); });
    return () => {
      disposed = true; cancelAnimationFrame(animation); cleanups.forEach(fn => fn());
      if (document.pointerLockElement === renderer?.domElement) document.exitPointerLock();
      scene.traverse(disposeObject); renderer?.dispose(); renderer?.domElement.remove(); engine.current = null;
    };
  }, []);

  const press = (key: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engine.current?.key(key, true); },
    onPointerUp: () => engine.current?.key(key, false), onPointerCancel: () => engine.current?.key(key, false), onLostPointerCapture: () => engine.current?.key(key, false),
  });
  const openMap=()=>{engine.current?.pause();setMapOpen(true);};
  return (
    <main className="explorer">
      <div className="scene" ref={host} /><div className="vignette" />
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Compass size={25} strokeWidth={1.4} /></span><div><strong>나주 산책</strong><span>NAJU, ON FOOT</span></div></div>
        <div className="location-pill"><span className="live-dot" /><span>{destination.area}</span><span className="pill-divider" /><span>실제 지도 기반</span></div>
        <div className="view-actions"><button className={overview ? 'active' : ''} onClick={() => engine.current?.overview()} disabled={!ready}><MoveUpRight size={16} />전체 보기</button><button className={!overview ? 'active' : ''} onClick={() => engine.current?.start()} disabled={!ready}><Footprints size={16} />걷기</button></div>
      </header>
      <nav className="destination-nav" aria-label="산책 장소">
        <button onClick={openMap}><Map size={18}/><span>지도로 이동</span><ArrowUpRight size={16}/></button>
      </nav>
      {world && <aside className="minimap" aria-label="현재 위치 지도">
        <div className="map-heading"><span>동네 지도</span><span>N ↑</span></div>
        <svg viewBox={`${world.bounds[0]} ${world.bounds[2]} ${world.bounds[1] - world.bounds[0]} ${world.bounds[3] - world.bounds[2]}`} role="img" aria-label={`현재 위치: ${view.place}`} onClick={openMap}>
          <rect x={world.bounds[0]} y={world.bounds[2]} width={world.bounds[1] - world.bounds[0]} height={world.bounds[3] - world.bounds[2]} fill="#e5e8df" />
          {mapSolids(world).map((s, i) => <polygon key={i} points={solidCollider(s).map(p => p.join(',')).join(' ')} fill={mapColor(s.name)} stroke={s.kind === 'building' ? '#9aada2' : 'none'} strokeWidth="0.7" />)}
          <g transform={`translate(${view.x} ${view.z}) scale(${(world.bounds[1]-world.bounds[0])/245})`}>
            <circle r="6" fill="#fff" /><circle r="3.5" fill="#c96734" />
            <path d="M 0,-11 L -3,-6 L 3,-6 Z" fill="#c96734" transform={`rotate(${-view.yaw * 180 / Math.PI})`} />
          </g>
        </svg><div className="map-legend"><span className="you-dot" />내 위치<span>약 {Math.round((world.bounds[1] - world.bounds[0]) / 10) * 10}m 구역</span></div>
        <button className="minimap-travel" onClick={openMap}>지도 열고 이동하기 <ArrowUpRight size={14}/></button>
      </aside>}
      {!active && <section className="welcome" aria-label="산책 시작">
        <div className="eyebrow"><span />나주 · {destination.name}</div>
        <h1>{started ? '잠시, 쉬어가기.' : <>{destination.heading[0]}<br />{destination.heading[1]}</>}</h1>
        <p>{started ? '산책을 이어가거나, 위에서 동네를 둘러보세요.' : <>{destination.introduction[0]}<br />{destination.introduction[1]}</>}</p>
        <button className="start-button" onClick={() => engine.current?.start()} disabled={!ready || !!error}><Footprints size={20} /><span>{error ? '화면을 열 수 없어요' : !ready ? '동네 불러오는 중…' : started ? '이어서 걷기' : '산책 시작하기'}</span><ArrowUpRight size={21} /></button>
        <div className="welcome-help"><span><kbd>W A S D</kbd> 이동</span><span>마우스 / 드래그로 둘러보기</span></div>
        {error && <div className="error-message" role="alert">{error}<button onClick={() => window.location.reload()}>다시 불러오기</button></div>}
      </section>}
      {active && <><div className="crosshair" aria-hidden="true" /><div className="place-card"><span className="place-icon"><MapPin size={21} /></span><div><span>{view.indoor ? '실내에 도착했어요' : '지금 걷는 곳'}</span><strong>{view.place}</strong><p>{view.detail}</p></div></div>
        <div className="touch-controls" aria-label="이동 버튼"><button aria-label="앞으로" {...press('KeyW')}><ArrowUp /></button><div><button aria-label="왼쪽으로" {...press('KeyA')}><ArrowLeft /></button><button aria-label="뒤로" {...press('KeyS')}><ArrowDown /></button><button aria-label="오른쪽으로" {...press('KeyD')}><ArrowRight /></button></div><div className="turn-controls"><button aria-label="왼쪽 보기" {...press('KeyQ')}>↶</button><button aria-label="오른쪽 보기" {...press('KeyE')}>↷</button></div></div></>}
      <footer className="bottom-bar"><div className="keyboard-guide"><span><kbd>W A S D</kbd> 이동</span><span><kbd>← →</kbd> 시선 회전</span><span><kbd>Shift</kbd> 빠르게</span><span><kbd>Esc</kbd> 쉬기</span></div><div className="bottom-actions"><button onClick={() => engine.current?.reset()} disabled={!ready} aria-label="출발 위치로 돌아가기"><RotateCcw size={16} />처음 위치</button>{active && <button onClick={() => engine.current?.pause()}><Pause size={16} />쉬기</button>}</div></footer>
      <div className="source-note"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap 기여자 · ODbL</a><span>·</span><a href={destination.sourceUrl} target="_blank" rel="noreferrer">{destination.sourceLabel}</a>{destinationId !== 'geumseonggwan' && <><span>·</span><a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noreferrer">Esri / Vantor 항공사진({destinationId==='dasi'?'2022':'2023'})</a></>}<span>· {destination.limitation}</span></div>
      {mapOpen&&<MapTravel destinationId={destinationId} world={world} position={[view.x,view.z]} onClose={()=>setMapOpen(false)} onTravel={(point,height)=>engine.current?.travel(point,height)??false}/>}
    </main>
  );
}
