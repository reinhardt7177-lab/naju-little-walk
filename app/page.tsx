'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Footprints, MapPin, RotateCcw, Pause, MoveUpRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { movePlayer, solidCollider, worldFloors, floorHeight, type World } from '@/lib/world';

type ViewState = { x: number; z: number; yaw: number; place: string; detail: string; indoor: boolean };
type Engine = { start: () => void; pause: () => void; reset: () => void; overview: () => void; key: (key: string, down: boolean) => void };

export default function Home() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [overview, setOverview] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewState>({ x: 0, z: 0, yaw: 0, place: '금성관 주변', detail: '', indoor: false });

  useEffect(() => {
    const mount = host.current!;
    let disposed = false, renderer: THREE.WebGLRenderer | undefined, animation = 0;
    const cleanups: (() => void)[] = [];
    const scene = new THREE.Scene();
    const setup = async () => {
      const response = await fetch('/city-world.json');
      if (!response.ok) throw new Error('도시 자료를 불러오지 못했습니다.');
      const data: World = await response.json();
      if (disposed) return;
      setWorld(data);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-label', '금성관 주변 3D 탐험 화면. 마우스를 끌어서 시선을 움직일 수 있습니다.');
      canvas.tabIndex = 0;
      mount.appendChild(canvas);
      scene.background = new THREE.Color('#bbd9e6');
      scene.fog = new THREE.Fog('#bbd9e6', 260, 690);
      scene.add(new THREE.HemisphereLight('#e1f3ff', '#918673', 2.8));
      const sun = new THREE.DirectionalLight('#fff0d1', 3.1);
      sun.position.set(-80, 145, 65); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -165;
      sun.shadow.camera.right = sun.shadow.camera.top = 165;
      sun.shadow.camera.far = 420; sun.shadow.normalBias = 0.06;
      scene.add(sun);
      const gltf = await new GLTFLoader().loadAsync('/models/geumseonggwan.glb');
      if (disposed) { gltf.scene.traverse(disposeObject); return; }
      gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = !o.name.startsWith('ground'); o.receiveShadow = true; } });
      scene.add(gltf.scene);
      const camera = new THREE.PerspectiveCamera(60, 1, 0.12, 1000);
      const colliders = data.solids.filter(s => s.collision).map(solidCollider);
      const floors = worldFloors(data.solids);
      let px = data.spawn.x, pz = data.spawn.z, yaw = data.spawn.yaw, pitch = 0;
      let playing = false, bird = true, drag = false, lastX = 0, lastY = 0;
      let orbit = 0.25, orbitElevation = 0.62, orbitRadius = 165;
      const center = new THREE.Vector3(data.spawn.x, 0, data.spawn.z - 3), keys = new Set<string>();
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
        reset: () => { px = data.spawn.x; pz = data.spawn.z; yaw = data.spawn.yaw; pitch = 0; start(); },
        overview: () => { pause(); bird = true; setOverview(true); },
        key: (key, down) => { if (down) keys.add(key); else keys.delete(key); },
      };
      const context = (document as Document & { modelContext?: { registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
      if (context?.registerTool) {
        const lifecycle = new AbortController();
        cleanups.push(() => lifecycle.abort());
        const state = () => ({ mode: bird ? 'overview' : playing ? 'walking' : 'paused', position: { x: px, z: pz }, source: data.source });
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
      listen(canvas, 'wheel', ((e: WheelEvent) => { if (bird) { e.preventDefault(); orbitRadius = THREE.MathUtils.clamp(orbitRadius + e.deltaY * 0.1, 85, 330); } }) as EventListener, { passive: false });
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
          const next = movePlayer(px, pz, (-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed, (-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed, colliders, data.bounds);
          px = next.x; pz = next.z;
        }
        if (bird) {
          camera.position.set(center.x + Math.sin(orbit) * Math.cos(orbitElevation) * orbitRadius, Math.sin(orbitElevation) * orbitRadius, center.z + Math.cos(orbit) * Math.cos(orbitElevation) * orbitRadius); camera.lookAt(center);
        } else { camera.position.set(px, 1.72 + floorHeight(px, pz, floors), pz); camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yaw, 0); }
        if (now - lastHud > 180) {
          const place = data.places.find(p => Math.hypot(p.position[0] - px, p.position[1] - pz) < p.radius);
          setView({ x: px, z: pz, yaw, place: place?.name ?? '금성관 주변 골목', detail: place?.description ?? '길을 따라 천천히 둘러보세요.', indoor: place?.id === 'interior' }); lastHud = now;
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
  return (
    <main className="explorer">
      <div className="scene" ref={host} /><div className="vignette" />
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Compass size={25} strokeWidth={1.4} /></span><div><strong>나주 산책</strong><span>NAJU, ON FOOT</span></div></div>
        <div className="location-pill"><span className="live-dot" /><span>금성관 주변</span><span className="pill-divider" /><span>실제 지도 기반</span></div>
        <div className="view-actions"><button className={overview ? 'active' : ''} onClick={() => engine.current?.overview()} disabled={!ready}><MoveUpRight size={16} />전체 보기</button><button className={!overview ? 'active' : ''} onClick={() => engine.current?.start()} disabled={!ready}><Footprints size={16} />걷기</button></div>
      </header>
      {world && <aside className="minimap" aria-label="현재 위치 지도">
        <div className="map-heading"><span>동네 지도</span><span>N ↑</span></div>
        <svg viewBox={`${world.bounds[0]} ${world.bounds[2]} ${world.bounds[1] - world.bounds[0]} ${world.bounds[3] - world.bounds[2]}`} role="img" aria-label={`현재 위치: ${view.place}`}>
          <rect x={world.bounds[0]} y={world.bounds[2]} width={world.bounds[1] - world.bounds[0]} height={world.bounds[3] - world.bounds[2]} fill="#e5e8df" />
          {world.solids.filter(s => s.name.startsWith('osm-building') || s.name.startsWith('ground_floor') || s.name.startsWith('road') || s.name.startsWith('hall-wall')).map((s, i) => <polygon key={i} points={solidCollider(s).map(p => p.join(',')).join(' ')} fill={s.name.startsWith('road') ? '#fafaf6' : s.name.startsWith('hall') ? '#407064' : '#b5c1b8'} stroke={s.kind === 'building' ? '#9aada2' : 'none'} strokeWidth="0.7" />)}
          <circle cx={view.x} cy={view.z} r="6" fill="#fff" /><circle cx={view.x} cy={view.z} r="3.5" fill="#c96734" />
          <path d="M 0,-11 L -3,-6 L 3,-6 Z" fill="#c96734" transform={`translate(${view.x} ${view.z}) rotate(${-view.yaw * 180 / Math.PI})`} />
        </svg><div className="map-legend"><span className="you-dot" />내 위치<span>약 280m 구역</span></div>
      </aside>}
      {!active && <section className="welcome" aria-label="산책 시작">
        <div className="eyebrow"><span />전라남도 나주 · 금성관</div>
        <h1>{started ? '잠시, 쉬어가기.' : <>골목 안으로,<br />나주 한 걸음.</>}</h1>
        <p>{started ? '산책을 이어가거나, 위에서 동네를 둘러보세요.' : <>지도 위의 건물과 길을 입체로 옮겼어요.<br />마당을 지나 금성관 안까지 걸어가 보세요.</>}</p>
        <button className="start-button" onClick={() => engine.current?.start()} disabled={!ready || !!error}><Footprints size={20} /><span>{error ? '화면을 열 수 없어요' : !ready ? '동네 불러오는 중…' : started ? '이어서 걷기' : '산책 시작하기'}</span><ArrowUpRight size={21} /></button>
        <div className="welcome-help"><span><kbd>W A S D</kbd> 이동</span><span>마우스 / 드래그로 둘러보기</span></div>
        {error && <div className="error-message" role="alert">{error}<button onClick={() => window.location.reload()}>다시 불러오기</button></div>}
      </section>}
      {active && <><div className="crosshair" aria-hidden="true" /><div className="place-card"><span className="place-icon"><MapPin size={21} /></span><div><span>{view.indoor ? '실내에 도착했어요' : '지금 걷는 곳'}</span><strong>{view.place}</strong><p>{view.detail}</p></div></div>
        <div className="touch-controls" aria-label="이동 버튼"><button aria-label="앞으로" {...press('KeyW')}><ArrowUp /></button><div><button aria-label="왼쪽으로" {...press('KeyA')}><ArrowLeft /></button><button aria-label="뒤로" {...press('KeyS')}><ArrowDown /></button><button aria-label="오른쪽으로" {...press('KeyD')}><ArrowRight /></button></div><div className="turn-controls"><button aria-label="왼쪽 보기" {...press('KeyQ')}>↶</button><button aria-label="오른쪽 보기" {...press('KeyE')}>↷</button></div></div></>}
      <footer className="bottom-bar"><div className="keyboard-guide"><span><kbd>W A S D</kbd> 이동</span><span><kbd>← →</kbd> 시선 회전</span><span><kbd>Shift</kbd> 빠르게</span><span><kbd>Esc</kbd> 쉬기</span></div><div className="bottom-actions"><button onClick={() => engine.current?.reset()} disabled={!ready} aria-label="출발 위치로 돌아가기"><RotateCcw size={16} />처음 위치</button>{active && <button onClick={() => engine.current?.pause()}><Pause size={16} />쉬기</button>}</div></footer>
      <div className="source-note"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap 기여자</a><span>·</span><a href="https://encykorea.aks.ac.kr/Article/E0011462" target="_blank" rel="noreferrer">금성관 사진 참고</a><span>· 높이·실내는 추정한 체험 모형</span></div>
    </main>
  );
}
