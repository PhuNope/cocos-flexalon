import { _decorator, Component } from 'cc';
const { ccclass, property, menu }=_decorator;
@ccclass('Flexalon.FlexalonGridCell')
@menu('Flexalon/Grid Cell')
export class FlexalonGridCell extends Component {
    /** -1 chooses sequential flow. */
    @property({tooltip: "Cột mong muốn của child (-1 = phân bổ tuần tự).", visible: true}) public column=-1;
    @property({tooltip: "Hàng mong muốn của child (-1 = phân bổ tuần tự).", visible: true}) public row=-1;
    @property({tooltip: "Số cột child chiếm trong Grid (ít nhất 1).", visible: true}) public columnSpan=1;
    @property({tooltip: "Số hàng child chiếm trong Grid (ít nhất 1).", visible: true}) public rowSpan=1;
}
