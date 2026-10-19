/** Deterministic linear flex allocation. */
export class FlexItem { constructor(public base = 0, public weight = 0, public min = 0, public max = Infinity) {} }
export class Flex {
    static distribute(items: FlexItem[], available: number): number[] {
        const values = items.map(i => Math.min(i.max,Math.max(i.min,i.base)));
        let remaining = Math.max(0,available - values.reduce((a,b)=>a+b,0));
        let active = items.map((_,i)=>i).filter(i => items[i].weight > 0 && values[i]<items[i].max);
        for(let attempt=0; attempt<=items.length && active.length && remaining>0.0001;attempt++){
            const total=active.reduce((s,i)=>s+items[i].weight,0);
            if(total<=0) break;
            let used=0;
            for(const i of active){const add=Math.min(items[i].max-values[i],remaining*items[i].weight/total);values[i]+=add; used+=add;}
            remaining-=used;
            active=active.filter(i=>values[i]<items[i].max-0.0001);
        }
        return values;
    }
}
