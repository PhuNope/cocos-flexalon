import { _decorator } from 'cc';
import { FlexalonComponent } from '../Core/FlexalonComponent';
const { ccclass, property, menu, executeInEditMode }=_decorator;
@ccclass('Flexalon.FlexalonGridCell')
@executeInEditMode
@menu('Flexalon/Grid Cell')
export class FlexalonGridCell extends FlexalonComponent {
    /** -1 chooses sequential flow. */
    @property({tooltip: "Cột mong muốn của child (-1 = phân bổ tuần tự).", visible: true}) public column=-1;
    @property({tooltip: "Hàng mong muốn của child (-1 = phân bổ tuần tự).", visible: true}) public row=-1;
    @property({tooltip: "Số cột child chiếm trong Grid (ít nhất 1).", visible: true}) public columnSpan=1;
    @property({tooltip: "Số hàng child chiếm trong Grid (ít nhất 1).", visible: true}) public rowSpan=1;
}
