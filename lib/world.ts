export type Vec3 = [number, number, number];
export type Point = [number, number];
export type Solid = {
  name: string;
  kind: 'box' | 'cylinder' | 'sphere' | 'roof' | 'building';
  position: Vec3;
  size: Vec3;
  color: string;
  rotation?: number;
  footprint?: Point[];
  collision?: boolean;
};
export type Sign = { text: string; position: Vec3; width: number; rotation?: number; color?: string };
export type Place = { id: string; name: string; description: string; position: Point; radius: number; indoor?: boolean; footprint?: Point[] };
export type World = {
  title: string;
  subtitle: string;
  source: string;
  bounds: [number, number, number, number];
  spawn: { x: number; z: number; yaw: number };
  solids: Solid[];
  signs: Sign[];
  places: Place[];
  lights?: { position: Vec3; color: string; intensity: number; distance: number }[];
};

export function currentPlace(x: number, z: number, places: Place[]): Place | undefined {
  return places.find(p => p.footprint ? hitsPolygon(x,z,p.footprint,0) : Math.hypot(p.position[0]-x,p.position[1]-z)<p.radius);
}

export type Collider = Point[];
export type Floor = { polygon: Collider; height: number };

export function worldFloors(solids: Solid[]): Floor[] {
  return solids.filter(s => s.name.startsWith('ground_floor') || s.name.startsWith('walk-floor')).map(s => ({ polygon: solidCollider(s), height: s.position[1] + s.size[1] * (s.kind === 'building' ? 1 : .5) }));
}

export function floorHeight(x: number, z: number, floors: Floor[]) {
  return floors.reduce((height, floor) => hitsPolygon(x, z, floor.polygon, 0) ? Math.max(height, floor.height) : height, 0);
}

export function solidCollider(s: Solid): Collider {
  const footprint = s.footprint ?? [
    [-s.size[0] / 2, -s.size[2] / 2], [s.size[0] / 2, -s.size[2] / 2],
    [s.size[0] / 2, s.size[2] / 2], [-s.size[0] / 2, s.size[2] / 2],
  ];
  const c = Math.cos(s.rotation ?? 0), sin = Math.sin(s.rotation ?? 0);
  return footprint.map(([x, z]) => [s.position[0] + x * c + z * sin, s.position[2] - x * sin + z * c]);
}

export function hitsPolygon(x: number, z: number, polygon: Collider, radius = 0.28) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    if ((x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2 < radius ** 2) return true;
  }
  return inside;
}

export function movePlayer(x: number, z: number, dx: number, dz: number, colliders: Collider[], bounds: World['bounds']) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  const blocked = (px: number, pz: number) => px < bounds[0] + 0.3 || px > bounds[1] - 0.3 || pz < bounds[2] + 0.3 || pz > bounds[3] - 0.3 || colliders.some(p => hitsPolygon(px, pz, p));
  for (let i = 0; i < steps; i++) {
    if (!blocked(x + dx / steps, z)) x += dx / steps;
    if (!blocked(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}
