import { _decorator, Component, Label, CCInteger } from "cc";

const {ccclass, property} = _decorator;

@ccclass("LocalizedText")
export class LocalizedText extends Component {
    @property(CCInteger)
    private num: number;

    @property
    public key: string = "";

    @property(Label)
    private text: Label;

    protected start() {
        console.log(`Key: ${this.key}`);
    }
}