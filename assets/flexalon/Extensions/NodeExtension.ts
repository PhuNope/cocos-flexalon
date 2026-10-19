import { Node,UITransform } from 'cc';
export function getUITransform(node:Node):UITransform|null{return node.getComponent(UITransform);}
