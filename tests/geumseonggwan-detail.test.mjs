import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
const world=JSON.parse(fs.readFileSync(new URL('../public/city-world.json',import.meta.url),'utf8'));
const metrics=JSON.parse(fs.readFileSync(new URL('../knowledge/sources/geumseonggwan-v77/metrics.json',import.meta.url),'utf8'));

test('architectural close views keep a finite target above ground and have unique controls',()=>{
  assert.deepEqual(world.architectureViews.map(v=>v.id),['hall-front','eaves','manghwaru']);
  for(const v of world.architectureViews){
    assert.ok([...v.center,v.radius,v.angle,v.elevation].every(Number.isFinite));
    assert.ok(v.center[1]>0&&v.radius>=10&&v.radius<=60);
  }
  assert.ok(world.architectureViews.find(v=>v.id==='eaves').elevation<.1,'Eave view must see the brackets from below');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(world.solids)).digest('hex'),metrics.collisionSHA256,'Detailing must preserve the verified wall, doorway and floor envelopes');
});

test('published model contains the curved brackets and fine fittings without exceeding hosting budget',()=>{
  const packed=fs.readFileSync(new URL('../public/models/geumseonggwan.glb.gz',import.meta.url));
  assert.ok(packed.length<25*1024*1024);
  const bytes=zlib.gunzipSync(packed);
  assert.deepEqual(bytes,fs.readFileSync(new URL('../public/models/geumseonggwan.glb',import.meta.url)));
  const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  for(const name of ['v77_ikgong_curved_arms','v77_ikgong_painted_edges','v77_morodancheong_scrolls','v77_door_iron_fittings','v77_hip_roof_barrel_courses']){
    const node=gltf.nodes.find(n=>n.name===name);assert.ok(node,name);
    const mesh=gltf.meshes[node.mesh];assert.ok(mesh.primitives.length>0);
    for(const p of mesh.primitives){
      const a=gltf.accessors[p.attributes.POSITION];assert.ok(a.count>10);
      assert.ok([...a.min,...a.max].every(Number.isFinite),name);
      assert.ok(a.max[1]>a.min[1],`${name} must have real height`);
    }
  }
  assert.ok(gltf.meshes.length<800,'Keep detail grouped for browser traversal');
  assert.equal(gltf.nodes.some(n=>/^(hall_ikgong_|manghwaru_ikgong_)/.test(n.name)),false,'Old block brackets must be replaced in the new copy');
});
