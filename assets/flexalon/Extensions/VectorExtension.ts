import { Vec3 } from 'cc';
export function maxVec3(a:Vec3,b:Vec3):Vec3{return new Vec3(Math.max(a.x,b.x),Math.max(a.y,b.y),Math.max(a.z,b.z));}
export function minVec3(a:Vec3,b:Vec3):Vec3{return new Vec3(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.min(a.z,b.z));}
