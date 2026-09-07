import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hitsPolygon, movePlayer, solidCollider, worldFloors, floorHeight } from '../lib/world.ts';

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
