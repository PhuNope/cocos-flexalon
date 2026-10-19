import { geometry, Vec3 } from 'cc';
export function aabbSize(b:geometry.AABB):Vec3 {return b.halfExtents.clone().multiplyScalar(2);}
export function aabbEquals(a:geometry.AABB,b:geometry.AABB):boolean {return a.center.strictEquals(b.center)&&a.halfExtents.strictEquals(b.halfExtents);}
