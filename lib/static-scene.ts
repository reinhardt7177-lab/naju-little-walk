import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch static opaque details for rendering; the editable Blender file stays separate. */
export function batchStaticScene(root: THREE.Object3D): { before: number; after: number } {
  root.updateMatrixWorld(true);
  const inverseRoot=new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups=new Map<string,THREE.Mesh[]>();
  let before=0;
  root.traverse(object=>{
    if (!(object instanceof THREE.Mesh)) return;
    before++;
    if (object instanceof THREE.SkinnedMesh || object instanceof THREE.InstancedMesh || Array.isArray(object.material) || object.material.transparent || object.morphTargetInfluences?.length) return;
    const attributes=(Object.entries(object.geometry.attributes) as [string,THREE.BufferAttribute | THREE.InterleavedBufferAttribute][]).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${(a instanceof THREE.BufferAttribute ? a.array : a.data.array).constructor.name}`).sort().join('|');
    const key=`${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${!!object.geometry.index}:${!!object.userData.hide_in_overview}:${attributes}`;
    const group=groups.get(key) ?? [];
    group.push(object); groups.set(key,group);
  });
  const retired=new Set<THREE.BufferGeometry>();
  let after=before;
  for (const meshes of groups.values()) {
    if (meshes.length<12) continue;
    const transformed=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot,mesh.matrixWorld)));
    const merged=mergeGeometries(transformed,false);
    transformed.forEach(geometry=>geometry.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const batch=new THREE.Mesh(merged,meshes[0].material);
    batch.name='static_detail_batch';
    batch.userData.hide_in_overview=!!meshes[0].userData.hide_in_overview;
    batch.castShadow=meshes[0].castShadow; batch.receiveShadow=meshes[0].receiveShadow;
    for(const mesh of meshes) { mesh.removeFromParent(); retired.add(mesh.geometry); }
    root.add(batch); after-=meshes.length-1;
  }
  root.traverse(object=>{ if(object instanceof THREE.Mesh) retired.delete(object.geometry); });
  retired.forEach(geometry=>geometry.dispose());
  return {before,after};
}
