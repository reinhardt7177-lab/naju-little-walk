import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hitsPolygon, movePlayer, solidCollider, worldFloors, floorHeight, currentPlace } from '../lib/world.ts';
import { destinationFromSearch, destinations } from '../lib/destinations.ts';
import * as THREE from 'three';
import { batchStaticScene } from '../lib/static-scene.ts';

const world = JSON.parse(fs.readFileSync(new URL('../public/city-world.json', import.meta.url), 'utf8'));
const colliders = world.solids.filter(s => s.collision).map(solidCollider);

test('mapped city has the five source buildings and an unblocked spawn', () => {
  assert.equal(world.buildings.length, 5);
  assert.ok(world.buildings.some(b => b.osm_id === '832423358'));
  assert.equal(colliders.some(p => hitsPolygon(world.spawn.x, world.spawn.z, p)), false);
});

test('walk from spawn through the actual hall doorway, reach interior, and return', () => {
  let p = { x: world.spawn.x, z: world.spawn.z };
  for (let i = 0; i < 150; i++) p = movePlayer(p.x, p.z, 0, -.2, colliders, world.bounds);
  const interior = world.places.find(p => p.id === 'interior');
  assert.ok(Math.hypot(p.x-interior.position[0],p.z-interior.position[1]) < interior.radius);
  assert.ok(p.z < world.spawn.z - 28);
  for (let i = 0; i < 150; i++) p = movePlayer(p.x, p.z, 0, .2, colliders, world.bounds);
  assert.ok(Math.abs(p.z-world.spawn.z) < .01);
});

test('high-speed movement cannot tunnel through a thin wall', () => {
  const wall = [[-2,-.05],[2,-.05],[2,.05],[-2,.05]];
  const p = movePlayer(0,2,0,-10,[wall],[-20,20,-20,20]);
  assert.ok(p.z >= .28);
});

test('walls allow sliding, and map boundaries keep the player inside', () => {
  const wall = [[1,-10],[1.1,-10],[1.1,10],[1,10]];
  const p = movePlayer(0,0,4,4,[wall],[-20,20,-20,20]);
  assert.ok(p.x < .75 && p.z > 3.9);
  const edge = movePlayer(0,0,50,50,[],[-10,10,-10,10]);
  assert.ok(edge.x <= 9.7 && edge.z <= 9.7);
});

test('Blender GLB is complete, self-contained, and contains the hall', () => {
  const buffer = fs.readFileSync(new URL('../public/models/geumseonggwan.glb', import.meta.url));
  assert.equal(buffer.toString('utf8',0,4),'glTF');
  assert.equal(buffer.readUInt32LE(4),2);
  assert.equal(buffer.readUInt32LE(8),buffer.length);
  const jsonLength=buffer.readUInt32LE(12);
  const gltf=JSON.parse(buffer.toString('utf8',20,20+jsonLength));
  assert.match(gltf.asset.generator,/Blender/);
  assert.ok(gltf.nodes.some(n => n.name === 'roof_832423358'));
  assert.ok(gltf.nodes.some(n => n.name === 'interior_panel'));
  assert.ok(gltf.buffers.every(b => !b.uri));
  assert.ok(!gltf.images?.some(i => i.uri));
});

test('stone stairs and elevated hall floors raise the walking eye level', () => {
  const floors=worldFloors(world.solids);
  const interior=world.places.find(p => p.id === 'interior');
  assert.ok(floorHeight(...interior.position,floors) > .9);
  assert.equal(floorHeight(world.spawn.x,world.spawn.z,floors),0);
  const steps=world.solids.filter(s => s.name.startsWith('walk-floor_step'));
  assert.equal(steps.length,5);
  for(const step of steps) assert.ok(floorHeight(step.position[0],step.position[2],floors) >= step.size[1]-.001);
});

const school = JSON.parse(fs.readFileSync(new URL('../public/dasi-world.json', import.meta.url), 'utf8'));
const schoolColliders = school.solids.filter(s => s.collision).map(solidCollider);

test('school navigation preserves the original destination and selects the school safely', () => {
  assert.equal(destinationFromSearch(''), 'geumseonggwan');
  assert.equal(destinationFromSearch('?place=dasi'), 'dasi');
  assert.equal(destinationFromSearch('?place=unknown'), 'geumseonggwan');
  for (const d of Object.values(destinations)) {
    assert.ok(fs.existsSync(new URL('../public'+d.worldUrl, import.meta.url)));
    assert.ok(fs.existsSync(new URL('../public'+d.modelUrl, import.meta.url)));
  }
});

test('school preserves both mapped building outlines and the campus boundary', () => {
  assert.equal(school.campus_osm_id, '963585633');
  assert.deepEqual(school.buildings.map(b => b.osm_id), ['963585634', '963585635']);
  assert.equal(school.buildings[0].footprint.length, 23);
  assert.equal(schoolColliders.some(c => hitsPolygon(school.spawn.x, school.spawn.z, c)), false);
  const campus = school.solids.find(s => s.name === 'ground_floor_campus');
  assert.ok(hitsPolygon(school.spawn.x, school.spawn.z, solidCollider(campus), 0));
});

test('school route reaches the field and front colonnade without crossing a building', () => {
  let p = { x: school.spawn.x, z: school.spawn.z };
  for (const [x,z] of [[3,7],[40,8],[56,8],[40,8],[3,7],[-35,7],[-42,5],[-29,-4]]) {
    p = movePlayer(p.x,p.z,x-p.x,z-p.z,schoolColliders,school.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.02, `Unreachable waypoint ${x},${z}: ${JSON.stringify(p)}`);
  }
  const floors=worldFloors(school.solids);
  assert.ok(floorHeight(p.x,p.z,floors)>=.065);
  const wallHit=movePlayer(p.x,p.z,0,-45,schoolColliders,school.bounds);
  assert.ok(wallHit.z>-14, 'The front facade must stop the player');
});

test('the full outdoor route connects parking, lawn, grove path and southeast yard', () => {
  let p={x:-42,z:5};
  for(const [x,z] of [[-40,14],[-44,35],[12,42.5],[12,20],[25,21],[25,16],[3,7]]) {
    p=movePlayer(p.x,p.z,x-p.x,z-p.z,schoolColliders,school.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.03,`Blocked outdoor route to ${x},${z}: ${JSON.stringify(p)}`);
  }
  for(const name of ['ground_floor_school_lawn','ground_floor_school_parking','ground_floor_south_grove','ground_floor_sport_court']) assert.ok(school.solids.some(s=>s.name===name));
  const field=school.solids.find(s=>s.name==='ground_floor_school_lawn');
  assert.equal(hitsPolygon(-55,0,solidCollider(field)),false,'The west parking area must not be grass');
  assert.equal(hitsPolygon(-10,35,solidCollider(field)),false,'The south grove must not be part of the field');
});

test('school GLB includes photo details and embeds its original brick texture', () => {
  const buffer=fs.readFileSync(new URL('../public/models/dasi-elementary.glb', import.meta.url));
  assert.equal(buffer.toString('utf8',0,4),'glTF');
  assert.equal(buffer.readUInt32LE(8),buffer.length);
  const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
  assert.match(gltf.asset.generator,/Blender/);
  for (const name of ['osm-building_963585634','roof_west_barrel','school_round_emblem','roof_blue_annex','gate_pier_0']) assert.ok(gltf.nodes.some(n=>n.name===name),name);
  assert.ok(gltf.images?.length>0);
  assert.ok(gltf.images.every(i=>!i.uri && i.bufferView!==undefined));
  assert.ok(gltf.buffers.every(b=>!b.uri));
});

test('school entrance leads continuously to the library and classroom and back outside', () => {
  const route=school.interior.walkRoute;
  let p={x:route[0][0],z:route[0][1]};
  for (const [x,z] of [...route.slice(1),...route.slice(0,-1).reverse()]) {
    p=movePlayer(p.x,p.z,x-p.x,z-p.z,schoolColliders,school.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.025, `Blocked school interior route to ${x},${z}: ${JSON.stringify(p)}`);
  }
  assert.ok(Math.hypot(p.x-school.spawn.x,p.z-school.spawn.z)<.025);
  const inside=school.places.find(p=>p.id==='corridor');
  assert.ok(floorHeight(...inside.position,worldFloors(school.solids))>=.2);
});

test('classroom partition and furniture block walking even at high speed', () => {
  const [start,end]=school.interior.wallProbe;
  const hit=movePlayer(...start,end[0]-start[0],end[1]-start[1],schoolColliders,school.bounds);
  assert.ok(Math.hypot(hit.x-end[0],hit.z-end[1])>.7);
  const desk=school.solids.find(s=>s.name==='student_desk_0_0_top');
  assert.ok(desk.collision);
  assert.ok(hitsPolygon(desk.position[0],desk.position[2],solidCollider(desk)));
});

test('indoor labels apply only within their room footprint', () => {
  for (const id of ['corridor','classroom','library']) {
    const room=school.places.find(p=>p.id===id);
    assert.equal(currentPlace(...room.position,school.places)?.id,id);
    assert.equal(currentPlace(...room.position,school.places)?.indoor,true);
  }
  assert.notEqual(currentPlace(school.spawn.x,school.spawn.z,school.places)?.indoor,true);
});

test('school facade lettering faces the courtyard and fits above the canopy', () => {
  const text=school.signs.find(s=>s.text==='다시초등학교' && s.width>8);
  assert.ok(text);
  const points=school.buildings[0].footprint;
  const a=points[22],b=points[0],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const dot=Math.sin(text.rotation)*dz/length+Math.cos(text.rotation)*(-dx)/length;
  assert.ok(dot>.999,'Front face of the letters must point toward the courtyard, not into the wall');
  assert.ok(text.position[1]-text.height/2>4.04,'Canopy/floor band must not hide the lettering');
  const vertical=school.signs.find(s=>s.text==='다\n시\n초\n등\n학\n교');
  assert.ok(vertical.height<=1.8,'Gate sign must fit its nameplate');
});

test('static detail batching preserves world bounds and keeps transparent windows separate', () => {
  const root=new THREE.Group(); root.position.set(4,2,-8); root.rotation.y=.3;
  const parent=new THREE.Group(); parent.position.set(-3,0,5); parent.rotation.y=-.7; root.add(parent);
  const material=new THREE.MeshStandardMaterial({color:'#779966'});
  const shape=new THREE.BoxGeometry(1,2,3);
  for(let i=0;i<25;i++) { const mesh=new THREE.Mesh(shape,material); mesh.position.set(i%5*2,0,Math.floor(i/5)*4); parent.add(mesh); }
  const window=new THREE.Mesh(shape,new THREE.MeshStandardMaterial({transparent:true,opacity:.25})); root.add(window);
  root.updateMatrixWorld(true);
  const before=new THREE.Box3().setFromObject(root,true);
  const stats=batchStaticScene(root);
  root.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(root,true);
  assert.equal(stats.before,26); assert.equal(stats.after,2);
  assert.ok(before.min.distanceTo(after.min)<.00001 && before.max.distanceTo(after.max)<.00001);
  assert.equal(window.parent,root,'Transparent panes must retain independent depth sorting');
});
