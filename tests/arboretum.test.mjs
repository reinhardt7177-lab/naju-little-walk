import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {movePlayer,solidCollider} from '../lib/world.ts';
import {canTravelTo,regionalPoint,regionalSize} from '../lib/map-navigation.ts';
import {destinations} from '../lib/destinations.ts';
const w=JSON.parse(fs.readFileSync(new URL('../public/naju-arboretum-world.json',import.meta.url)));
test('arboretum main avenue is continuous, and trunks and pond block walking',()=>{
 const obstacles=w.solids.filter(s=>s.collision).map(solidCollider);
 assert.ok(canTravelTo([w.spawn.x,w.spawn.z],w));
 let p={x:w.spawn.x,z:w.spawn.z};
 for(let i=0;i<1600;i++)p=movePlayer(p.x,p.z,.245,.05,obstacles,w.bounds);
 assert.ok(Math.hypot(p.x-w.spawn.x,p.z-w.spawn.z)>390,'Walk the whole main avenue');
 const trunk=w.solids.find(s=>s.name==='tree_trunk');assert.equal(canTravelTo([trunk.position[0],trunk.position[2]],w),false);
 const pond=w.solids.find(s=>s.name==='pond_boundary');
 const a=pond.footprint[0],b=pond.footprint[1];assert.equal(canTravelTo([(a[0]+b[0])/2,(a[1]+b[1])/2],w),false);
});
test('arboretum download is exact and regional destination stays inside the map',()=>{
 const raw=fs.readFileSync(new URL('../public/models/naju-arboretum.glb',import.meta.url));
 assert.ok(zlib.gunzipSync(fs.readFileSync(new URL('../public/models/naju-arboretum.glb.gz',import.meta.url))).equals(raw));
 const d=destinations['naju-arboretum'],p=regionalPoint(d.coordinates.lon,d.coordinates.lat);
 assert.ok(p[0]>0&&p[0]<regionalSize[0]&&p[1]>0&&p[1]<regionalSize[1]);
});
