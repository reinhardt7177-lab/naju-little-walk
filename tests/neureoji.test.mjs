import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {destinations} from '../lib/destinations.ts';
import {mapArrival,canTravelTo,regionalPoint,regionalSize} from '../lib/map-navigation.ts';
import {moveOnFloors,worldFloors,worldObstacles} from '../lib/world.ts';
import {sceneArrival} from '../lib/scene-travel.ts';
import * as THREE from 'three';
import {readModel} from './gltf-geometry.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const w=read('public/neureoji-world.json');
test('all tower levels are reached by actual steps and can be descended without teleporting',()=>{
 const floors=worldFloors(w.solids),obstacles=worldObstacles(w.solids);
 let p={x:w.spawn.x,z:w.spawn.z,height:w.spawn.height};
 for(const [x,z,h] of [...w.walkRoute.slice(1),...w.walkRoute.slice(0,-1).reverse()]){
  p=moveOnFloors(p.x,p.z,p.height,x-p.x,z-p.z,obstacles,floors,w.bounds,w.requireFloor);
  assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`route ${x},${z},${h}: ${JSON.stringify(p)}`);
  assert.ok(Math.abs(p.height-h)<.22,`floor elevation ${h}: ${p.height}`);
 }
 assert.ok(Math.abs(p.height-w.spawn.height)<.001);
 assert.ok(!canTravelTo([-1000,-1000],w),'River scenery is outside the local walking map');
});
test('arrival links and local map destinations land on the intended floor',()=>{
 const top=sceneArrival(w,'?place=neureoji&at=top');assert.ok(top.entered);assert.equal(top.height,w.topDeckHeightMetres);
 for(const place of w.places){const p=mapArrival(place,w);assert.ok(p,place.id);assert.ok(canTravelTo(p,w,place.arrivalHeight));}
 const p=regionalPoint(destinations.neureoji.coordinates.lon,destinations.neureoji.coordinates.lat);
 assert.ok(p[0]>0&&p[0]<regionalSize[0]&&p[1]>0&&p[1]<regionalSize[1]);
});
test('present tower, native DSM limitations and true concave river are recorded',()=>{
 const g=read('knowledge/sources/neureoji-v92/geography.json'),t=read('knowledge/sources/neureoji-v92/native-terrain.json');
 assert.deepEqual(g.originWGS84,{lat:34.9159348,lon:126.5419381});assert.equal(t.nativeResolutionMetres,30);
 assert.ok(w.towerHeightMetres<16&&w.towerHeightMetres>14);assert.ok(w.limitations.some(x=>x.includes('측량')));
 assert.ok(g.water.some(p=>p.points.length>100));assert.ok(!g.water.every(p=>p.points.length===4));
 const raw=fs.readFileSync(new URL('../public/models/neureoji.glb',import.meta.url)),packed=fs.readFileSync(new URL('../public/models/neureoji.glb.gz',import.meta.url));assert.deepEqual(gunzipSync(packed),raw);
 const gltf=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12)));assert.ok(gltf.meshes.length<100);assert.ok(packed.length<15*1024*1024);
 assert.ok(gltf.nodes.some(n=>n.name==='mapped_river_water_neureoji'));assert.ok(gltf.nodes.some(n=>n.name==='walk-floor_top_deck'));
 assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
});
test('walkers stand on exported Blender floors and the normal-height panorama sightline is open',()=>{
 const {scene}=readModel(new URL('../public/models/neureoji.glb',import.meta.url));
 for(const n of [0,6,21,28,44,52,67,w.walkRoute.length-1]){
  const [x,z,h]=w.walkRoute[n];const hits=new THREE.Raycaster(new THREE.Vector3(x,h+.12,z),new THREE.Vector3(0,-1,0),0,.25).intersectObject(scene,true);
  assert.ok(hits.length,`No visible floor at route ${n}: ${x},${z},${h}`);
  assert.ok(Math.abs(hits[0].point.y-h)<.03,`Visible floor and walking height disagree at ${n}`);
 }
 const origin=new THREE.Vector3(-1.6,w.topDeckHeightMetres+1.72,-3),target=new THREE.Vector3(-850,5,-900),direction=target.clone().sub(origin);
 const hits=new THREE.Raycaster(origin,direction.clone().normalize(),.1,200).intersectObject(scene,true);
 assert.equal(hits.length,0,'Roof, pillars and nearby trees must not hide the peninsula view');
 scene.traverse(o=>o.geometry?.dispose());
});
