import { Node } from 'cc';
export interface FlexalonDataBinding<T=unknown> { bind(node:Node,data:T,index:number):void; }
