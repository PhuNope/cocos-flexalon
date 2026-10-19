import { Size,Vec3 } from 'cc';
export function sizeToVec3(s:Size):Vec3 {return new Vec3(s.width,s.height,0);}
