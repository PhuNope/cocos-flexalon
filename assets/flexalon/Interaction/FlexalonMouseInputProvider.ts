import { _decorator, Component, input, Input, EventMouse, EventTouch, Vec2, Node } from 'cc';
import { InputProvider } from './FlexalonInputProvider';
const {ccclass,menu}=_decorator;
@ccclass('Flexalon.FlexalonMouseInputProvider')
@menu('Flexalon/Mouse Input Provider')
export class FlexalonMouseInputProvider extends Component implements InputProvider {
    private pointer=new Vec2();private pressed=false;
    get UIPointer():Vec2 {return this.pointer;}
    get Active():boolean{return this.pressed;}
    get ExternalFocusedObject():Node|null{return null;}
    protected onEnable():void {
        input.on(Input.EventType.MOUSE_MOVE,this.mouseMove,this);
        input.on(Input.EventType.MOUSE_DOWN,this.mouseDown,this);
        input.on(Input.EventType.MOUSE_UP,this.mouseUp,this);
        input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);
        input.on(Input.EventType.TOUCH_START,this.touchStart,this);
        input.on(Input.EventType.TOUCH_END,this.touchEnd,this);
        input.on(Input.EventType.TOUCH_CANCEL,this.touchEnd,this);
    }
    protected onDisable():void {
        for(const [event,cb] of [[Input.EventType.MOUSE_MOVE,this.mouseMove],[Input.EventType.MOUSE_DOWN,this.mouseDown],[Input.EventType.MOUSE_UP,this.mouseUp],[Input.EventType.TOUCH_MOVE,this.touchMove],[Input.EventType.TOUCH_START,this.touchStart],[Input.EventType.TOUCH_END,this.touchEnd],[Input.EventType.TOUCH_CANCEL,this.touchEnd]] as const)input.off(event,cb,this);
        this.pressed=false;
    }
    private mouseMove(e:EventMouse):void {this.pointer.set(e.getUILocation());}
    private mouseDown(e:EventMouse):void {this.pointer.set(e.getUILocation());this.pressed=true;}
    private mouseUp(e:EventMouse):void {this.pointer.set(e.getUILocation());this.pressed=false;}
    private touchMove(e:EventTouch):void {this.pointer.set(e.getUILocation());}
    private touchStart(e:EventTouch):void {this.pointer.set(e.getUILocation());this.pressed=true;}
    private touchEnd(e:EventTouch):void {this.pointer.set(e.getUILocation());this.pressed=false;}
}
