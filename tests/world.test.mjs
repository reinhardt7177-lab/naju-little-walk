import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hitsPolygon, movePlayer, moveOnFloors, reachableFloor, blocksWalking, worldObstacles, solidCollider, worldFloors, floorHeight, currentPlace } from '../lib/world.ts';
import { destinationFromSearch, destinations } from '../lib/destinations.ts';
import * as THREE from 'three';
import { batchStaticScene } from '../lib/static-scene.ts';
import { canTravelTo, mapArrival, regionalPoint, regionalSize } from '../lib/map-navigation.ts';

const bogam=JSON.parse(fs.readFileSync(new URL('../public/bogam-world.json',import.meta.url),'utf8'));
const bogamColliders=bogam.solids.filter(s=>s.collision).map(solidCollider);
const museum=JSON.parse(fs.readFileSync(new URL('../public/bogam-museum-world.json',import.meta.url),'utf8'));
const museumFloors=worldFloors(museum.solids), museumObstacles=worldObstacles(museum.solids);

test('museum bridge bends have walkable outer corners and continuous edge guards',()=>{
  const frame=JSON.parse(fs.readFileSync(new URL('../knowledge/sources/bogam-museum-hall-frame.json',import.meta.url),'utf8')).hallFrame;
  const local=(x,z)=>[frame.center[0]+frame.u[0]*x+frame.v[0]*z,frame.center[1]+frame.u[1]*x+frame.v[1]*z];
  for(const point of [[-22.05,-19.55],[-6.15,-19.55],[-7.25,-3.25],[21.25,-4.35]]){
    const [x,z]=local(...point);
    assert.ok(Math.abs(reachableFloor(x,z,museum.bridgeHeight,museumFloors)-museum.bridgeHeight)<.001,`Missing corner floor ${point}`);
    assert.equal(blocksWalking(x,z,museum.bridgeHeight,museumObstacles),false,`Corner passage blocked ${point}`);
  }
  const route=[[-21.5,-18.3],[-22.05,-19.55],[-20.8,-19]].map(p=>local(...p));
  let p={x:route[0][0],z:route[0][1],height:museum.bridgeHeight};
  for(const [x,z] of [...route.slice(1),...route.slice(0,-1).reverse()]){
    p=moveOnFloors(p.x,p.z,p.height,x-p.x,z-p.z,museumObstacles,museumFloors,museum.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`Cannot walk around finished corner: ${JSON.stringify(p)}`);
  }
  for(const point of [[-22.54,-19.55],[-22.05,-20.04],[-6.15,-20.04],[-5.66,-19.55],[-7.74,-3.25],[-7.25,-2.76],[21.74,-4.35],[21.25,-4.84],[20.7,17.74]]){
    assert.equal(blocksWalking(...local(...point),museum.bridgeHeight,museumObstacles),true,`Missing edge guard ${point}`);
  }
});

test('museum lower lobby does not snap to the cafe above, and the stairs reach the full bridge circuit',()=>{
  let p={x:museum.spawn.x,z:museum.spawn.z,height:.12};
  assert.equal(reachableFloor(p.x,p.z,0,museumFloors),.12);
  assert.ok(floorHeight(p.x,p.z,museumFloors)>3,'This spot actually has an upper cafe floor');
  for(const [x,z] of museum.walkRoute.slice(1)){
    p=moveOnFloors(p.x,p.z,p.height,x-p.x,z-p.z,museumObstacles,museumFloors,museum.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`Blocked museum route ${x},${z}: ${JSON.stringify(p)}`);
  }
  assert.ok(Math.abs(p.height-museum.bridgeHeight)<.001,'Stairs must physically raise the visitor to the bridge');
  for(const [x,z] of museum.walkRoute.slice(0,-1).reverse()){
    p=moveOnFloors(p.x,p.z,p.height,x-p.x,z-p.z,museumObstacles,museumFloors,museum.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`Blocked return from museum bridge ${x},${z}: ${JSON.stringify(p)}`);
  }
  assert.ok(Math.abs(p.height-.12)<.001);
});

test('upper floors reject large drops and museum map jumps use the selected viewing level',()=>{
  const bridge=museum.places.find(p=>p.id==='bridge');
  const p=mapArrival(bridge,museum);
  assert.ok(canTravelTo(p,museum,bridge.arrivalHeight));
  assert.equal(canTravelTo(p,museum,0),false,'Ground inside the replica cannot be used as a shortcut');
  assert.equal(blocksWalking(...p,bridge.arrivalHeight,museumObstacles),false);
  const platform={polygon:[[-2,-2],[2,-2],[2,2],[-2,2]],height:3.5};
  const stopped=moveOnFloors(0,0,3.5,8,0,[],[platform],[-20,20,-20,20]);
  assert.ok(stopped.x<=2,'Upper-floor edge cannot cause an instant fall');
});

test('cafe staircase connects the lower lobby to the reading area and returns beneath the same floor',()=>{
  const frame=JSON.parse(fs.readFileSync(new URL('../knowledge/sources/bogam-museum-hall-frame.json',import.meta.url),'utf8')).hallFrame;
  const local=(x,z)=>[frame.center[0]+frame.u[0]*x+frame.v[0]*z,frame.center[1]+frame.u[1]*x+frame.v[1]*z];
  const route=[[-16,52],[-24.2,52],[-30,56.35],[-34,56.35],...museum.stairs.cafe.map(p=>[p[0],p[1]]),[-34,48.3],[-31.5,48.3],[-15,47.5]].map(p=>local(...p));
  let p={x:route[0][0],z:route[0][1],height:.12};
  for(const [x,z] of route.slice(1)){
    p=moveOnFloors(p.x,p.z,p.height,x-p.x,z-p.z,museumObstacles,museumFloors,museum.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`Blocked cafe route ${x},${z}: ${JSON.stringify(p)}`);
  }
  assert.ok(Math.abs(p.height-museum.bridgeHeight)<.001);
  assert.equal(currentPlace(p.x,p.z,museum.places,p.height)?.id,'cafe');
  for(const [x,z] of route.slice(0,-1).reverse()){
    p=moveOnFloors(p.x,p.z,p.height,x-p.x,z-p.z,museumObstacles,museumFloors,museum.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.05);
  }
  assert.ok(Math.abs(p.height-.12)<.001);
});

test('museum GLB includes the observed interior, 41 traced facilities, 22 jar burials and 38 theatre seats',()=>{
  assert.equal(destinationFromSearch('?place=bogam-museum'),'bogam-museum');
  assert.equal(museum.burials.length,41);
  assert.equal(museum.burials.filter(b=>b.category==='jar_coffin').length,22);
  assert.equal(museum.burials.filter(b=>b.category==='stone_burial').length,18);
  const buffer=fs.readFileSync(new URL('../public/models/bogam-museum.glb',import.meta.url));
  assert.equal(buffer.readUInt32LE(8),buffer.length);
  const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
  assert.match(gltf.asset.generator,/Blender/);
  for(const name of ['replica_excavation_surface','pottery_case_glass','walk-floor_bridge_0','cutaway_main_roof','cutaway_visitor_roof','theatre_screen'])assert.ok(gltf.nodes.some(n=>n.name===name),name);
  for(let i=1;i<=22;i++)assert.ok(gltf.nodes.some(n=>n.name===`burial_J${i}`),`Jar burial ${i}`);
  assert.equal(gltf.nodes.filter(n=>/^theatre_seat_\d+_\d+$/.test(n.name)).length,38);
  assert.equal(gltf.nodes.filter(n=>/^S96_internal_jar_\d$/.test(n.name)).length,4);
  assert.ok(gltf.nodes.some(n=>n.extras?.hide_in_overview));
  assert.ok(gltf.images.every(i=>!i.uri));
});

test('Bogam preserves four individually shaped mounds, source scale and numbering',()=>{
  assert.equal(bogam.site_osm_id,'471352010');
  assert.match(bogam.source,/OpenStreetMap.*ODbL/);
  assert.equal(bogam.mounds.length,4);
  const [one,two,three,four]=bogam.mounds;
  assert.ok(one.center[1]<two.center[1] && two.center[1]<three.center[1]);
  assert.ok(four.center[0]<three.center[0]);
  assert.deepEqual([one.width,one.height],[18,4.5]);
  assert.deepEqual([three.width,three.depth,three.height],[38,42,6]);
  assert.deepEqual([four.width,four.depth,four.height],[23,31.5,3.15]);
  assert.match(two.dimensions_source,/estimate.*NOT a recorded/);
  for(const m of bogam.mounds)assert.ok(bogamColliders.some(c=>hitsPolygon(...m.center,c)));
});

test('walk a complete Bogam circuit to all four mounds and back without crossing a mound',()=>{
  let p={x:bogam.spawn.x,z:bogam.spawn.z};
  assert.ok(canTravelTo([p.x,p.z],bogam));
  for(const [x,z] of bogam.walkRoute.slice(1)){
    p=movePlayer(p.x,p.z,x-p.x,z-p.z,bogamColliders,bogam.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.03,`Blocked mound circuit ${x},${z}: ${JSON.stringify(p)}`);
  }
  assert.ok(Math.hypot(p.x-bogam.spawn.x,p.z-bogam.spawn.z)<.03);
  const from=[55,35],through=[-5,35];
  const hit=movePlayer(...from,through[0]-from[0],0,bogamColliders,bogam.bounds);
  assert.ok(hit.x>40,'Walking cannot pass through the large mound');
});

test('map relocation rejects obstacles, nonfinite coordinates and out-of-bounds destinations',()=>{
  assert.equal(destinationFromSearch('?place=bogam'),'bogam');
  for(const d of Object.values(destinations)){
    const w=JSON.parse(fs.readFileSync(new URL('../public'+d.worldUrl,import.meta.url),'utf8'));
    assert.ok(canTravelTo([w.spawn.x,w.spawn.z],w));
    for(const p of w.places){
      const target=mapArrival(p,w);
      assert.ok(target,`No accessible arrival for ${d.name} / ${p.name}`);
      assert.ok(canTravelTo(target,w,p.arrivalHeight??0));
    }
    for(const point of [[NaN,0],[0,Infinity],[w.bounds[0]-.1,0],[0,w.bounds[3]+1]])assert.equal(canTravelTo(point,w),false);
    const pin=regionalPoint(d.coordinates.lon,d.coordinates.lat);
    assert.ok(pin[0]>0&&pin[0]<regionalSize[0]&&pin[1]>0&&pin[1]<regionalSize[1]);
  }
  for(const m of bogam.mounds)assert.equal(canTravelTo(m.center,bogam),false);
  for(const p of bogam.places)assert.deepEqual(mapArrival(p,bogam),p.arrival);
});

test('Bogam exported GLB has four solid mound surfaces with upward normals and embedded original grass',()=>{
  const buffer=fs.readFileSync(new URL('../public/models/bogam-tumuli.glb',import.meta.url));
  assert.equal(buffer.toString('utf8',0,4),'glTF');
  assert.equal(buffer.readUInt32LE(8),buffer.length);
  const jsonLength=buffer.readUInt32LE(12);
  const gltf=JSON.parse(buffer.toString('utf8',20,20+jsonLength));
  assert.match(gltf.asset.generator,/Blender/);
  assert.ok(gltf.images.length>0&&gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(gltf.buffers.every(b=>!b.uri));
  for(const m of bogam.mounds){
    const node=gltf.nodes.find(n=>n.name===`mound_${m.id}`);
    assert.ok(node,`Missing mound ${m.id}`);
    const primitive=gltf.meshes[node.mesh].primitives[0];
    const position=gltf.accessors[primitive.attributes.POSITION];
    assert.ok(Math.abs(position.max[1]-position.min[1]-m.height)<.001);
    const normals=gltf.accessors[primitive.attributes.NORMAL];
    const view=gltf.bufferViews[normals.bufferView];
    let up=0;
    for(let i=0;i<normals.count;i++){
      const offset=20+jsonLength+8+(view.byteOffset??0)+(normals.byteOffset??0)+i*(view.byteStride??12);
      if(buffer.readFloatLE(offset+4)>.5)up++;
    }
    assert.ok(up>normals.count*.3,'Most visible slopes and plateau should face upward');
  }
});

const neighborhood = JSON.parse(fs.readFileSync(new URL('../public/dasi-neighborhood-world.json', import.meta.url), 'utf8'));
const neighborhoodColliders = neighborhood.solids.filter(s => s.collision).map(solidCollider);

test('neighborhood preserves school coordinates, mapped station and source attribution', () => {
  assert.deepEqual(neighborhood.bounds,[-285,285,-245,195]);
  assert.equal(neighborhood.campus_osm_id,'963585633');
  assert.match(neighborhood.source,/OpenStreetMap.*ODbL/);
  assert.ok(neighborhood.buildings.length > 55);
  const station = neighborhood.buildings.find(b=>b.osm_id==='605798599');
  assert.ok(station && station.footprint.length===4);
  for (const building of neighborhood.buildings) {
    assert.ok(building.osm_id || building.trace_id,'Every building needs source coordinates');
    assert.ok(building.height_source,'Estimated heights must have provenance');
  }
  for (const [id,count] of [['963585625',10],['963585637',5],['963585641',4]]) {
    const b=neighborhood.buildings.find(b=>b.osm_id===id);
    assert.equal(b.floors,count);assert.match(b.floors_source,/^https:/);
  }
  for (const id of ['W03','W16','W27']) assert.ok(!neighborhood.buildings.some(b=>b.trace_id===id),'Mapped silhouettes must not be duplicated');
  assert.equal(neighborhoodColliders.some(c=>hitsPolygon(neighborhood.spawn.x,neighborhood.spawn.z,c)),false);
});

test('walk from school grounds along Dasi-ro to the station and back',()=>{
  const gate=neighborhood.neighborhood.school_gate.center;
  const route=[[3,7],[-35,7],[-42,5],[-40,14],[-44,35],gate,[-36.44,49.72],[80,73],[100,78]];
  let p={x:route[0][0],z:route[0][1]};
  for(const [x,z] of [...route.slice(1),...route.slice(0,-1).reverse()]){
    p=movePlayer(p.x,p.z,x-p.x,z-p.z,neighborhoodColliders,neighborhood.bounds);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.03,`Blocked station route ${x},${z}: ${JSON.stringify(p)}`);
  }
  const station=neighborhood.buildings.find(b=>b.osm_id==='605798599');
  const center=station.footprint.reduce((p,q)=>[p[0]+q[0]/4,p[1]+q[1]/4],[0,0]);
  assert.ok(neighborhoodColliders.some(c=>hitsPolygon(...center,c)),'Station exterior must block entry');
});

test('railway uses paired 1435 mm rails and platforms raise the walking floor',()=>{
  const floors=worldFloors(neighborhood.solids);
  const platforms=neighborhood.solids.filter(s=>s.name.startsWith('walk-floor_platform_'));
  assert.equal(platforms.length,2);
  for(const platform of platforms){
    const pts=platform.footprint; const p=pts.reduce((a,b)=>[a[0]+b[0]/pts.length,a[1]+b[1]/pts.length],[0,0]);
    assert.ok(floorHeight(...p,floors)>.4);
  }
  for(const r of neighborhood.neighborhood.railways)assert.equal(r.gauge,1.435);
  const left=neighborhood.solids.find(s=>s.name.startsWith('rail_')&&s.name.endsWith('_-1'));
  const right=neighborhood.solids.find(s=>s.name===left.name.replace(/_-1$/,'_1'));
  assert.ok(Math.abs(Math.hypot(left.position[0]-right.position[0],left.position[2]-right.position[2])-1.435)<1e-6);
  const covers=neighborhood.solids.filter(s=>s.name.startsWith('crop-cover'));
  assert.ok(covers.length>=4);assert.ok(covers.every(s=>!s.collision&&s.size[1]<.1));
});

test('neighborhood GLB contains the station and outward-facing roof surfaces',()=>{
  const buffer=fs.readFileSync(new URL('../public/models/dasi-neighborhood.glb',import.meta.url));
  assert.equal(buffer.readUInt32LE(8),buffer.length);
  const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
  assert.match(gltf.asset.generator,/Blender/);
  assert.ok(gltf.nodes.some(n=>n.name==='station_blue_nameboard'));
  assert.ok(gltf.nodes.some(n=>n.name==='school_name_readable'));
  assert.ok(gltf.buffers.every(b=>!b.uri));assert.ok(!gltf.images?.some(i=>i.uri));
  const sign=neighborhood.signs.find(s=>s.text==='다시역');
  assert.ok(Math.cos(sign.rotation)<-.95,'Station sign must face its north approach');
  // Inspect exported normals rather than just reproducing the roof implementation.
  const roofNode=gltf.nodes.find(n=>n.name==='neighborhood_roof_605798599');
  const normalAccessor=gltf.accessors[gltf.meshes[roofNode.mesh].primitives[0].attributes.NORMAL];
  const view=gltf.bufferViews[normalAccessor.bufferView];
  const binOffset=20+buffer.readUInt32LE(12)+8;
  let upward=0;
  for(let i=0;i<normalAccessor.count;i++){
    const offset=binOffset+(view.byteOffset??0)+(normalAccessor.byteOffset??0)+i*(view.byteStride??12);
    if(buffer.readFloatLE(offset+4)>.2)upward++;
  }
  assert.ok(upward>0,'Roof must have upward-facing exterior normals');
});

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
