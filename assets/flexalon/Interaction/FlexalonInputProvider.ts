import { Node, Vec2 } from 'cc';
export enum InputMode { Pointer=0, External=1 }
export interface InputProvider {
    readonly Active:boolean;
    readonly UIPointer:Vec2;
    readonly ExternalFocusedObject:Node|null;
}
