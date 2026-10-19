import { Vec3 } from 'cc';
export class FlexalonMath {
    static Clamp(value: number, min: number, max: number): number { return Math.min(Math.max(value, min), max); }
    static ClampVec(value: Vec3, min: Vec3, max: Vec3): Vec3 { return new Vec3(this.Clamp(value.x,min.x,max.x),this.Clamp(value.y,min.y,max.y),this.Clamp(value.z,min.z,max.z)); }
    static Approximately(a: number,b: number,epsilon = 0.0001): boolean { return Math.abs(a-b) <= epsilon; }
    static VecApproximately(a: Vec3,b: Vec3,epsilon = 0.0001): boolean { return this.Approximately(a.x,b.x,epsilon) && this.Approximately(a.y,b.y,epsilon) && this.Approximately(a.z,b.z,epsilon); }
    static Lerp(a: number,b: number,t: number): number { return a+(b-a)*this.Clamp(t,0,1); }
    static Seeded(seed: number): () => number { let x = seed | 0; return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    static Bezier(a: Vec3,b: Vec3,c: Vec3,d: Vec3,t: number): Vec3 { const u=1-t; return new Vec3(u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y,u*u*u*a.z+3*u*u*t*b.z+3*u*t*t*c.z+t*t*t*d.z); }
    static BezierTangent(a: Vec3,b: Vec3,c: Vec3,d: Vec3,t: number): Vec3 { const u=1-t; return new Vec3(3*u*u*(b.x-a.x)+6*u*t*(c.x-b.x)+3*t*t*(d.x-c.x),3*u*u*(b.y-a.y)+6*u*t*(c.y-b.y)+3*t*t*(d.y-c.y),3*u*u*(b.z-a.z)+6*u*t*(c.z-b.z)+3*t*t*(d.z-c.z)); }
}
/** Backward compatible name from the early TS port. */
export { FlexalonMath as Math };
