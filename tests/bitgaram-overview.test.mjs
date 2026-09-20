import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
test('district overview transports exact geometry and retains destination pins',()=>{
 let triangles=0;
 for(const name of ['bitgaram-overview','bitgaram-overview-part2']){
 const raw=read(`public/models/${name}.glb`);assert.ok(raw.length<32*1024*1024);assert.ok(zlib.gunzipSync(read(`public/models/${name}.glb.gz`)).equals(raw));
 const g=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));
 assert.ok(g.meshes.length>10);assert.ok(g.buffers.every(b=>!b.uri));
 for(const mesh of g.meshes)for(const p of mesh.primitives){const a=g.accessors[p.indices];assert.equal(a.componentType,5123);assert.ok(a.max[0]<g.accessors[p.attributes.POSITION].count);triangles+=a.count/3;}
 for(const a of g.accessors)for(const values of [a.min,a.max])if(values)assert.ok(values.every(Number.isFinite));
 }
 assert.equal(triangles,1691742,'Both transport parts together keep every triangle');
 const pins=JSON.parse(read('public/bitgaram-orbit.json')).pins;
 assert.deepEqual(pins.map(p=>p.id).sort(),['bitgaram-kentech','bitgaram-kepco','bitgaram-park']);
 for(const p of pins)assert.ok(p.position.every(Number.isFinite));
});
test('district additions distinguish mapped buildings and estimated satellite roofs',()=>{
 const m=JSON.parse(read('knowledge/sources/bitgaram/district-completion-metrics.json'));
 const source=new Map(JSON.parse(read('knowledge/sources/bitgaram/district-2026-09-20.json')).ways.map(w=>[w.id,w]));
 assert.ok(m.counts.mapped_buildings>=80);assert.ok(m.counts.parking_areas>0);assert.ok(m.counts.sports_areas>0);
 assert.equal(m.buildings.filter(b=>b.estimated_footprint).length,m.counts.estimated_roofs);
 for(const b of m.buildings){assert.ok(b.height>0&&b.height<=160);if(!b.estimated_footprint)assert.ok(source.get(b.id)?.tags.building);}
});
