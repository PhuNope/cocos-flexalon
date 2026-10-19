import { geometry, Vec3 } from 'cc';
export function createAABB(center:Vec3,size:Vec3):geometry.AABB {return new geometry.AABB(center.x,center.y,center.z,size.x*.5,size.y*.5,size.z*.5);}
