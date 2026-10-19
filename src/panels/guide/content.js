'use strict';
/** Offline Vietnamese learning content. Kept separate from panel code for easy editing. */
module.exports = [
  {
    id:'getting-started', name:'Bắt đầu', group:'Cơ bản', glyph:'✦', diagram:'overview', time:'5 phút',
    tagline:'Từ Scene trống đến layout đầu tiên',
    intro:'Hướng dẫn dùng Flexalon trong Cocos Creator >= 3.8.2. Mỗi layout điều khiển các node con trực tiếp và tự gắn FlexalonObject cho node chứa layout.',
    use:'Học nhanh quy trình cài đặt, gắn component và thay đổi kích thước.',
    tree:'Canvas\n└── DemoLayout  (UITransform + FlexalonFlexibleLayout)\n    ├── Item_01  (UITransform + Sprite)\n    ├── Item_02  (UITransform + Sprite)\n    └── Item_03  (UITransform + Sprite)',
    steps:[
      'Giải nén gói extension vào extensions/flexalon-tools của dự án. Không cần copy assets/flexalon: runtime được nạp từ Asset Database của extension.',
      'Mở Extension Manager → Project, bật / reload flexalon-tools; nếu cần thì khởi động lại Editor.',
      'Trong Canvas, tạo node DemoLayout và thêm UITransform kích thước 500 × 240.',
      'Chọn DemoLayout → Add Component → Flexalon → Flexible Layout; FlexalonObject sẽ tự đi kèm.',
      'Thêm ba node con có UITransform + Sprite để nhìn thấy kết quả.',
      'Trong Flexible Layout đặt Direction = PositiveX, Gap = 12; muốn xuống hàng bật Wrap.',
      'Thay đổi kích thước child hoặc cấu hình FlexalonObject rồi dùng Auto Update / Refresh Layouts.'
    ],
    fields:[['Auto Update','true','Tự cập nhật bố cục trong Editor hoặc Preview.'],['Width/Height Type','Component','Đọc kích thước từ UITransform.'],['Width/Height Type','Layout','Tự đo nội dung layout nếu muốn cha fit content.'],['Preserve UI Content Size','false','Cho phép Flexalon cập nhật UITransform.width/height.']],
    tips:['Nếu đang dùng cc.Layout trên cùng một node, hãy tắt/bỏ nó để tránh 2 hệ thống cùng ghi vị trí.', 'Không cần gắn FlexalonObject vào mọi child nếu chỉ sử dụng kích thước UITransform.'],
    task:'Tạo một hàng 3 Sprite cách nhau 12 và bật Wrap để kiểm tra khi thu nhỏ container.'
  },
  {
    id:'FlexalonObject', name:'Flexalon Object', group:'Cơ bản', glyph:'▣', diagram:'object', time:'6 phút',
    tagline:'Kích thước, margin và transform của một node',
    intro:'FlexalonObject mô tả node được layout đo và sắp xếp như thế nào. Tùy chọn size theo từng trục độc lập.',
    use:'Sử dụng khi cần kích thước Fixed, Fill, Layout, khoảng cách ngoài, offset hoặc loại child khỏi layout.',
    tree:'Container  (Flexible/Grid Layout)\n└── ProductCard  (UITransform + FlexalonObject)\n    └── Label',
    steps:['Thêm UITransform vào ProductCard, kích thước ban đầu 100 × 80.', 'Thêm FlexalonObject trên ProductCard.', 'Để Width Type = Fixed, Height Type = Fixed nếu muốn tự đặt kích thước; nhập Size = (200, 80, 1).', 'Để Width Type = Fill nếu layout cha cần phân bổ không gian theo trọng số Fill X.', 'Nếu ProductCard tự chứa một layout, đặt Width/Height Type = Layout để fit content.', 'Điều chỉnh Margin và Offset nếu muốn thêm khoảng cách hoặc tinh chỉnh vị trí.', 'Tắt Preserve UI Content Size khi muốn kích thước tính toán ghi vào UITransform.'],
    fields:[['widthType / heightType','Fixed / Fill / Component / Layout','Fixed dùng Size, Fill do cha phân bổ, Component từ UITransform, Layout đo nội dung.'],['size','(200, 80, 1)','Chỉ áp dụng trục tương ứng đang Fixed.'],['fill','(1, 1, 1)','Trọng số được dùng khi trục đang Fill.'],['minSize / maxSize','(0, 0, 0)','Giới hạn kích thước; 0 ở Max nghĩa là không giới hạn.'],['marginLeft / Right / Top / Bottom','10 / 10 / 0 / 0','Khoảng cách bên ngoài child.'],['rotationOffset','(0, 0, 15)','Cộng góc xoay vào rotation do layout quyết định.'],['skipLayout','false','True: loại node khỏi kết quả sắp xếp.'],['preserveUIContentSize','false','True: không ghi đè contentSize; có thể lệch kích thước hiển thị.']],
    tips:['Layout ≠ Fill: Layout ôm nội dung của chính node; Fill nhận phần khoảng trống do cha cấp.', 'Nếu child có rotation cũ, layout vẫn ghi rotation mục tiêu; sử dụng rotationOffset để xoay có chủ đích.'],
    task:'Đặt một child Fixed 200 × 80 rồi kiểm tra UITransform.contentSize thực tế.'
  },
  {
    id:'FlexalonFlexibleLayout', name:'Flexible Layout', group:'Layout', glyph:'↝', diagram:'flex', time:'7 phút',
    tagline:'Hàng/cột co giãn và tự xuống dòng',
    intro:'Đặt child lần lượt theo một hướng, có khoảng cách và nhiều lựa chọn canh chỉnh. Wrap có thể giới hạn cứng số phần tử trên mỗi dòng.',
    use:'Thanh công cụ, inventory, danh sách card, hàng button, bố cục wrapping.',
    tree:'Canvas\n└── Inventory  (UITransform + Flexible Layout)\n    ├── Slot_01\n    ├── Slot_02\n    ├── Slot_03\n    ├── Slot_04\n    └── Slot_05',
    steps:['Tạo node Inventory dưới Canvas với UITransform 420 × 300.', 'Thêm Flexible Layout (tự require FlexalonObject).', 'Tạo 7 child có UITransform/Sprite, mỗi child 100 × 70.', 'Đặt Direction = PositiveX, Wrap = true, Wrap Direction = NegativeY.', 'Đặt Max Items Per Line = 3 để cứ đủ 3 item là ép sang dòng tiếp.', 'Thiết lập Gap = 10, Wrap Gap = 14.', 'Dùng Main Align / Cross Align / Wrap Align để thử các kiểu căn.', 'Thu nhỏ Inventory: nếu không đủ chiều rộng, child vẫn xuống dòng sớm hơn 3 item.'],
    fields:[['direction','PositiveX','Hướng xếp item trong từng dòng.'],['wrap','true','Cho phép thêm dòng/cột.'],['maxItemsPerLine','3','0 = không giới hạn; 3 = tối đa 3 phần tử / dòng.'],['wrapDirection','NegativeY','Dòng tiếp theo đi xuống dưới.'],['gap / wrapGap','10 / 14','Khoảng cách item / khoảng cách dòng.'],['gapOptions','Fixed','SpaceBetween, SpaceAround, SpaceEvenly dùng khoảng trống còn lại.'],['mainAlign / crossAlign / wrapAlign','Center','Canh item, trục phụ và cả nhóm dòng.']],
    tips:['Max Items Per Line chỉ hoạt động khi Wrap bật.', 'Wrap phụ thuộc vùng chứa: nếu container nhỏ, có thể xuống hàng trước giới hạn item.'],
    task:'Thiết lập 7 Sprite thành 3–3–1 bằng Max Items Per Line = 3.'
  },
  {
    id:'FlexalonGridLayout', name:'Grid Layout', group:'Layout', glyph:'▦', diagram:'grid', time:'8 phút',
    tagline:'Lưới đều, fit theo child và lưới tổ ong',
    intro:'Hỗ trợ Rectangle/Hexagonal, lựa chọn Uniform hoặc FitChildren để xử lý child khác kích thước.',
    use:'Inventory dạng ô, thư viện ảnh, thẻ sản phẩm và lưới tổ ong.',
    tree:'Canvas\n└── GridRoot  (UITransform + Grid Layout)\n    ├── Card_01 (180 × 50)\n    ├── Card_02 (60 × 20)\n    ├── Card_03 (40 × 90)\n    └── Card_04 (120 × 30)',
    steps:['Tạo GridRoot dưới Canvas và thêm Grid Layout.', 'Thêm 4 child, mỗi child có UITransform/Sprite; cố tình dùng kích thước khác nhau.', 'Đặt Cell Type = Rectangle, Columns = 2, Rows = 0.', 'Đặt Cell Sizing = FitChildren: mỗi cột/hàng đo theo child lớn nhất.', 'Đặt Column Gap = 10, Row Gap = 10; thay đổi Horizontal/Vertical Align nếu cần.', 'Thử Cell Sizing = Uniform để so sánh ô đồng đều.', 'Muốn tổ ong: đặt Cell Type = Hexagonal. Sử dụng sprite lục giác riêng; layout không tạo mesh/sprite hình lục giác.', 'Khi GridRoot cần ôm nội dung, đặt Width/Height Type = Layout trên FlexalonObject của GridRoot.'],
    fields:[['cellType','Rectangle / Hexagonal','Lưới chữ nhật hoặc hàng xen kẽ dạng tổ ong.'],['cellSizing','FitChildren','Kích thước cột/hàng dựa trên child khác nhau.'],['columns / rows','2 / 0','Rows = 0 cho phép tự tính hàng.'],['columnGap / rowGap','10 / 10','Khoảng cách ô.'],['startCorner / startAxis','TopLeft / x','Góc và thứ tự điền ô.'],['horizontalAlign / verticalAlign','Center','Căn child trong cell.']],
    tips:['Hexagonal hiện dùng kích thước ô đều để tránh méo khoảng cách tổ ong, không dùng FitChildren như Rectangle.', 'Grid có thể vượt kích thước container nếu child quá lớn; chỉnh UITransform hoặc thiết lập Fill đúng mục đích.'],
    task:'Tạo Grid 2 cột với 4 child khác kích thước và thử 2 chế độ Cell Sizing.'
  },
  {
    id:'FlexalonGridCell', name:'Grid Cell', group:'Layout', glyph:'⊞', diagram:'span', time:'4 phút',
    tagline:'Gán vị trí ô và cho child chiếm nhiều hàng/cột',
    intro:'FlexalonGridCell gắn trên child của Grid Layout để ưu tiên row/column và span.',
    use:'Một card lớn chiếm hai cột, item nổi bật hoặc dashboard không đồng đều.',
    tree:'GridRoot  (Grid Layout, Columns = 3)\n├── HeroCard  (GridCell: Column Span = 2)\n├── SideCard\n└── BottomCard',
    steps:['Tạo Grid Layout với Columns = 3, Cell Type = Rectangle.', 'Chọn child HeroCard nằm trực tiếp trong GridRoot.', 'Thêm Flexalon Grid Cell.', 'Để Column = -1 và Row = -1 nếu muốn Grid tự chọn ô còn trống.', 'Đặt Column Span = 2 và Row Span = 1 để chiếm 2 cột.', 'Đặt Column / Row từ 0 trở lên để yêu cầu ô cụ thể, rồi xem lại các child còn lại.'],
    fields:[['column','-1','-1 = tự điền, >=0 = cột được yêu cầu.'],['row','-1','-1 = tự điền, >=0 = hàng được yêu cầu.'],['columnSpan','2','Số cột được chiếm (>=1).'],['rowSpan','1','Số hàng được chiếm (>=1).']],
    tips:['Grid Cell không phải layout: hãy thêm nó trên child thuộc Grid Layout.', 'Đối với Hexagonal, nên ưu tiên span = 1 để giữ độ đều của hình học tổ ong.'],
    task:'Tạo card đầu tiên chiếm 2 cột trong Grid 3 cột.'
  },
  {
    id:'FlexalonCircleLayout', name:'Circle Layout', group:'Layout', glyph:'◉', diagram:'circle', time:'8 phút',
    tagline:'Vòng tròn, ellipse, spiral và các vòng đồng tâm',
    intro:'Phân bố child trên mặt phẳng XY/XZ/ZY. Radius Type: Constant, Step hoặc Wrap như bản Unity.',
    use:'Radial menu, carousel tròn, vòng kỹ năng, hình xoắn ốc.',
    tree:'Canvas\n└── RadialMenu (Circle Layout)\n    ├── Action_01\n    ├── Action_02\n    ├── Action_03\n    └── Action_04',
    steps:['Tạo RadialMenu dưới Canvas, thêm UITransform và Circle Layout.', 'Tạo 8 child Sprite để nhìn thấy kết quả.', 'Đặt Plane = XY và Radius X = Radius Y = 100.', 'Đặt Radius Type = Constant nếu muốn một vòng cố định.', 'Để tạo spiral, chọn Radius Type = Step, Radius Step = 20, Spacing Type = Fixed và Spacing Degrees = 45.', 'Để tạo vòng đồng tâm, chọn Radius Type = Wrap, Spacing Type = Fixed, Spacing Degrees = 90 và Radius Step = 40.', 'Đặt Start Angle = 0 và bật Rotate To Tangent nếu muốn child xoay theo tiếp tuyến (XY).'],
    fields:[['plane','XY','Mặt phẳng bố trí.'],['radiusX / radiusY','100 / 100','Bán kính cơ sở.'],['radiusType','Constant / Step / Wrap','Giữ nguyên / tăng mỗi child / tăng mỗi vòng.'],['radiusStep','20','Số đơn vị tăng (hoặc giảm nếu âm).'],['spacingType','Fixed / Evenly','Chọn góc cố định hoặc chia đều theo cung.'],['spacingDegrees','45','Hiện khi Fixed.'],['arcAngle','360','Hiện khi Evenly.'],['startAngle','0','Góc bắt đầu; ảnh hưởng cách đếm vòng Wrap.'],['rotateToTangent','false','Chỉ áp dụng xoay tiếp tuyến ở mặt phẳng XY.']],
    tips:['Radius Step có thể âm nhưng bán kính nhỏ quá có thể khiến các item gần nhau.', 'Wrap phụ thuộc tổng góc quay, nên dùng Fixed spacing để chủ động số child / vòng.'],
    task:'Dùng 12 child, Wrap / Fixed 90° / Radius Step 50 để có 3 vòng.'
  },
  {
    id:'FlexalonAlignLayout', name:'Align Layout', group:'Layout', glyph:'≡', diagram:'align', time:'4 phút',
    tagline:'Canh child theo X, Y và Z',
    intro:'Đặt các child vào cùng vị trí canh được xác định bởi Horizontal, Vertical, Depth Align. Không phải layout tạo hàng/cột.',
    use:'Overlay nhiều layer UI, badge chồng lên icon, tạo điểm neo chung.',
    tree:'Canvas\n└── BadgeArea  (Align Layout)\n    ├── Icon\n    ├── Counter\n    └── Highlight',
    steps:['Tạo node BadgeArea với UITransform 300 × 200.', 'Thêm Align Layout.', 'Tạo Icon, Counter, Highlight làm child trực tiếp.', 'Đặt Horizontal Align = Center, Vertical Align = Center.', 'Đổi Horizontal Align = End để đưa cả nhóm về mép phải.', 'Nếu muốn mỗi child có lệch riêng, thêm FlexalonObject trên child và chỉnh Offset.'],
    fields:[['horizontalAlign','Center','Start / Center / End theo chiều ngang.'],['verticalAlign','Center','Start / Center / End theo chiều dọc.'],['depthAlign','Center','Canh theo chiều sâu Z.']],
    tips:['Các child có thể chồng lên nhau: đó là hành vi mong muốn của Align Layout.', 'Để rải child thành hàng, sử dụng Flexible Layout thay vì Align Layout.'],
    task:'Tạo icon + counter chồng lên nhau và chỉnh Counter Offset.'
  },
  {
    id:'FlexalonCurveLayout', name:'Curve Layout', group:'Layout', glyph:'⌁', diagram:'curve', time:'7 phút',
    tagline:'Xếp các child dọc đường Bézier 4 điểm',
    intro:'Layout dùng đường Bézier bậc ba (P0, P1, P2, P3) và hỗ trợ chia đều gần đúng theo độ dài cung.',
    use:'Menu cong, đường đi của icon, bố cục dạng sóng.',
    tree:'Canvas\n└── CurveContainer  (Curve Layout)\n    ├── Waypoint_01\n    ├── Waypoint_02\n    ├── Waypoint_03\n    └── Waypoint_04',
    steps:['Tạo CurveContainer dưới Canvas và thêm Curve Layout.', 'Tạo 5 child Sprite kích thước 40 × 40.', 'Đặt Point 0 = (-150, 0, 0), Point 1 = (-50, 150, 0).', 'Đặt Point 2 = (50, -150, 0), Point 3 = (150, 0, 0).', 'Bật Uniform Distance nếu muốn phân phối khoảng cách đều hơn dọc đường cong.', 'Bật Orient Along Curve nếu muốn child xoay theo hướng tiếp tuyến của đường.'],
    fields:[['point0 / point3','(-150,0,0) / (150,0,0)','Hai điểm đầu và cuối.'],['point1 / point2','(-50,150,0) / (50,-150,0)','Hai tay nắm điều khiển độ cong.'],['uniformDistance','true','Bố trí đều theo độ dài xấp xỉ.'],['orientAlongCurve','false','Xoay child theo hướng của đường trên XY.']],
    tips:['Uniform Distance là phép xấp xỉ qua các mẫu, không phải nghiệm giải tích chính xác.', 'Nếu child bị xoay lệch do texture, dùng FlexalonObject.rotationOffset để bù.'],
    task:'Tạo 5 waypoint trên Bézier dạng chữ S.'
  },
  {
    id:'FlexalonRandomLayout', name:'Random Layout', group:'Layout', glyph:'✧', diagram:'random', time:'4 phút',
    tagline:'Rải child ngẫu nhiên nhưng có thể tái hiện',
    intro:'Sắp xếp các child theo vị trí được sinh từ Seed cố định. Normalized Extent điều khiển phạm vi rải trên mỗi trục.',
    use:'Trang trí các item rải tự nhiên, hiệu ứng card/particle UI tĩnh.',
    tree:'Canvas\n└── Scatter  (Random Layout)\n    ├── Star_01\n    ├── Star_02\n    └── Star_03',
    steps:['Tạo Scatter với UITransform đủ rộng/cao.', 'Thêm Random Layout.', 'Tạo 10 child Sprite.', 'Đặt Seed = 12345 để kết quả ổn định.', 'Đặt Normalized Extent = (1, 1, 0) để rải 2D.', 'Thay Seed để tạo bố cục khác.'],
    fields:[['seed','12345','Giữ nguyên để kết quả random tái lập.'],['normalizedExtent','(1,1,0)','Phạm vi rải theo tỷ lệ kích thước nội dung.']],
    tips:['Random Layout không đảm bảo child không đè nhau.', 'Nếu chỉ muốn làm nhiễu vị trí của Flexible/Grid, thử Random Modifier thay vì Random Layout.'],
    task:'Rải 10 ngôi sao với cùng Seed qua nhiều lần Preview.'
  },
  {
    id:'FlexalonShapeLayout', name:'Shape Layout', group:'Layout', glyph:'⬡', diagram:'shape', time:'6 phút',
    tagline:'Xếp child theo chu vi Rectangle, Ellipse hoặc Polygon',
    intro:'Tâm các child được rải dọc đường biên hình học. Có thể chỉnh số cạnh và góc bắt đầu khi dùng Polygon.',
    use:'UI viền, menu hình lục giác, các marker trên đường bao.',
    tree:'Canvas\n└── ShapeContainer  (Shape Layout)\n    ├── Marker_01\n    ├── Marker_02\n    └── Marker_03',
    steps:['Tạo ShapeContainer và thêm Shape Layout.', 'Thêm 8 child Sprite làm marker.', 'Đặt Shape = Rectangle và Width = 300, Height = 200 để tạo đường khung.', 'Đổi Shape = Ellipse để rải quanh hình oval.', 'Đổi Shape = Polygon, Sides = 6 để rải quanh đa giác 6 cạnh.', 'Chỉnh Start Angle để xoay polygon/ellipse.'],
    fields:[['shape','Polygon','Rectangle / Ellipse / Polygon.'],['width / height','300 / 200','Kích thước đường bao dùng cho tâm child.'],['sides','6','Chỉ hiển thị ở Polygon, tối thiểu 3.'],['startAngle','-90','Hiển thị ở Ellipse/Polygon.']],
    tips:['Shape Layout rải tâm child, không vẽ viền, sprite hay polygon thực tế.', 'Circle Layout tạo góc cách đều trên vòng; Shape Layout đặt tâm theo đường viền tương ứng.'],
    task:'Rải 6 item trên chu vi đa giác đều 6 cạnh.'
  },
  {
    id:'FlexalonConstraint', name:'Constraint', group:'Hiệu ứng & tương tác', glyph:'↗', diagram:'constraint', time:'5 phút',
    tagline:'Theo vị trí và rotation của node mục tiêu',
    intro:'Ràng buộc một node với target bằng tọa độ thế giới; có tùy chọn bám rotation.',
    use:'Badge đi theo target, marker, UI world-space.',
    tree:'Canvas\n├── Target  (UITransform)\n└── Follower  (FlexalonConstraint) → Target',
    steps:['Tạo hai node Target và Follower.', 'Trên Follower thêm Flexalon Constraint.', 'Kéo Target từ Hierarchy vào property Target.', 'Đặt World Offset = (20, 20, 0).', 'Bật Follow Rotation nếu cũng muốn copy rotation thế giới.', 'Di chuyển Target rồi kiểm tra Follower.'],
    fields:[['target','Node tham chiếu','Node được bám theo.'],['worldOffset','(20,20,0)','Độ lệch vị trí thế giới.'],['followRotation','false','Bật nếu muốn đồng bộ rotation.']],
    tips:['Đừng để các hệ thống khác đồng thời điều khiển transform của Follower.', 'World Offset không phải local offset của parent.'],
    task:'Cho icon Follower bám phía trên Target 20 đơn vị.'
  },
  {
    id:'FlexalonRandomModifier', name:'Random Modifier', group:'Hiệu ứng & tương tác', glyph:'✳', diagram:'modifier', time:'4 phút',
    tagline:'Thêm độ lệch ngẫu nhiên sau khi layout xếp',
    intro:'Không thay thế Grid/Flexible mà tạo nhiễu vị trí dựa trên Seed và Position Range.',
    use:'Làm bố cục bớt cứng hoặc thêm jitter lặp lại được.',
    tree:'Container  (Flexible Layout + Random Modifier)\n├── Item_01\n├── Item_02\n└── Item_03',
    steps:['Tạo container có Flexible Layout và một vài child.', 'Thêm Random Modifier lên container (cùng node với layout).', 'Đặt Seed = 347.', 'Đặt Position Range = (10, 10, 0) để random nhẹ theo XY.', 'Thử chỉnh Position Range X/Y lớn hơn để quan sát.', 'Nếu nội dung đè nhau, hạ Range hoặc tăng Gap.'],
    fields:[['seed','347','Dùng seed cố định để tái hiện độ lệch.'],['positionRange','(10,10,0)','Độ lệch tối đa trên từng trục.']],
    tips:['Đây là một bản port modifier cơ bản, nên kiểm tra trong Editor thực tế.', 'Độ lệch ngẫu nhiên có thể tạo chồng lấp dù Grid/Flexible ban đầu không chồng.'],
    task:'Rải lệch nhẹ một hàng button mà vẫn giữ thứ tự gốc.'
  },
  {
    id:'FlexalonCloner', name:'Cloner', group:'Tạo nội dung', glyph:'▤', diagram:'clone', time:'5 phút',
    tagline:'Nhân bản Prefab vào container',
    intro:'Sinh child từ Prefab theo số lượng định trước. Có API Rebuild/Clear và tùy chọn Rebuild On Start.',
    use:'Tạo danh sách item từ một mẫu prefab, vòng item, lưới tự động.',
    tree:'Canvas\n└── GeneratedGrid  (Grid Layout + Cloner)\n    ├── __flexalon_clone_0\n    ├── __flexalon_clone_1\n    └── ...',
    steps:['Tạo một Prefab có UITransform/Sprite dùng làm mẫu Item.', 'Tạo GeneratedGrid và thêm Grid Layout.', 'Thêm Flexalon Cloner lên GeneratedGrid.', 'Kéo Prefab vào trường Prefab và đặt Count = 8.', 'Bật Rebuild On Start rồi nhấn Preview để tạo 8 child.', 'Nếu cần tạo lại bằng code, lấy component và gọi Rebuild(); muốn xóa các child do Cloner quản lý thì gọi Clear().'],
    fields:[['prefab','Prefab mẫu','Được instantiate thành child trực tiếp.'],['count','8','Số bản sao, giới hạn 0–1000.'],['rebuildOnStart','true','Tạo mới khi start chạy.'],['generatedPrefix','__flexalon_clone_','Dấu nhận diện để Clear không xóa nhầm child khác.']],
    tips:['Trong bản port này, Rebuild không tự kích hoạt khi bạn chỉ đổi Count trong Inspector; dùng Rebuild On Start hoặc gọi Rebuild().', 'Clear xóa các node có tiền tố quản lý: tránh đặt prefix trùng child không do Cloner sinh ra.'],
    task:'Sinh 8 Card prefab tự động thành Grid 4 cột.'
  },
  {
    id:'FlexalonAspectRatioAdapter', name:'Aspect Ratio Adapter', group:'Hiệu ứng & tương tác', glyph:'▭', diagram:'ratio', time:'4 phút',
    tagline:'Giữ tỷ lệ Width / Height',
    intro:'Giữ tỷ lệ hình chữ nhật UI dựa vào width hoặc height, tránh card bị méo khi layout thay đổi.',
    use:'Ảnh thumbnail, card hình vuông, tile 16:9.',
    tree:'GridRoot\n└── Thumbnail  (UITransform + AspectRatioAdapter)',
    steps:['Tạo Thumbnail với UITransform.', 'Thêm Aspect Ratio Adapter trên Thumbnail.', 'Đặt Aspect Ratio = 1.7778 để tạo vùng 16:9.', 'Đặt Drive Height = true để giữ width và suy ra height.', 'Nếu muốn giữ height và suy ra width, tắt Drive Height.', 'Kiểm tra khi resize layout cha.'],
    fields:[['aspectRatio','1.7778','Width / Height, phải lớn hơn 0.'],['driveHeight','true','True: từ Width tính Height; false: từ Height tính Width.']],
    tips:['Có thể xung đột nếu một component khác cũng khóa cả Width lẫn Height.', 'Để tạo card vuông, Aspect Ratio = 1.'],
    task:'Tạo thumbnail 16:9 trong Grid.'
  },
  {
    id:'FlexalonLerpAnimator', name:'Lerp Animator', group:'Hiệu ứng & tương tác', glyph:'➜', diagram:'anim', time:'5 phút',
    tagline:'Chuyển động mượt về vị trí layout mục tiêu',
    intro:'Nội suy transform đến vị trí mà layout tính, giảm hiện tượng child nhảy đột ngột khi cập nhật.',
    use:'Danh sách thay đổi thứ tự, layout động và hiệu ứng chuyển vị trí.',
    tree:'Container  (Flexible Layout)\n└── Item_01  (Lerp Animator)',
    steps:['Tạo Container có Flexible Layout và 3 child.', 'Thêm Lerp Animator vào child muốn chuyển mượt.', 'Đặt Speed = 12 và Snap Distance = 0.01.', 'Khi Preview, thay đổi layout hoặc vị trí đích được layout cung cấp.', 'Thử tăng Speed để chuyển nhanh hơn, giảm Speed để chuyển chậm.'],
    fields:[['speed','12','Độ nhanh nội suy.'],['snapDistance','0.01','Khoảng cách ngưỡng để đưa ngay tới đích.']],
    tips:['Đây là bản animator cơ bản; chuyển động phụ thuộc lịch cập nhật runtime.', 'Animator cần có nguồn kết quả layout để nội suy tới.'],
    task:'Đổi thứ tự item khi Preview và theo dõi vị trí dịch chuyển.'
  },
  {
    id:'FlexalonCurveAnimator', name:'Curve Animator', group:'Hiệu ứng & tương tác', glyph:'◠', diagram:'curve-anim', time:'6 phút',
    tagline:'Di chuyển node theo quỹ đạo Bézier theo thời gian',
    intro:'Dùng 4 điểm điều khiển, Duration và Loop để chạy đường cong theo thời gian.',
    use:'Icon bay, hiệu ứng chuyển cảnh và đồ vật di chuyển theo đường cong.',
    tree:'Canvas\n└── FlyingIcon  (Sprite + Curve Animator)',
    steps:['Tạo FlyingIcon dưới Canvas.', 'Thêm Curve Animator.', 'Đặt P0 = (-100,0,0), P1 = (-50,100,0).', 'Đặt P2 = (50,-100,0), P3 = (100,0,0).', 'Đặt Duration = 2 và bật Loop nếu muốn lặp.', 'Nhấn Preview để xem chuyển động.'],
    fields:[['p0 / p3','Điểm đầu / cuối','Hai đầu quỹ đạo.'],['p1 / p2','Điểm điều khiển','Xác định độ cong.'],['duration','2','Số giây / lượt.'],['loop','true','Lặp khi kết thúc.']],
    tips:['Curve Animator di chuyển chính node gắn script; Curve Layout xếp nhiều child tĩnh thành đường cong.', 'Nếu cùng node có Layout điều khiển vị trí, hai hệ thống có thể ghi đè nhau.'],
    task:'Tạo icon bay qua đường cong chữ S mỗi 2 giây.'
  },
  {
    id:'FlexalonInteractable', name:'Interactable', group:'Hiệu ứng & tương tác', glyph:'✥', diagram:'drag', time:'6 phút',
    tagline:'Kéo child UI bằng chuột hoặc cảm ứng',
    intro:'Bắt sự kiện TOUCH_START/MOVE/END của node UI. Trong lúc kéo, tạm bật skipLayout để layout cha không kéo item về vị trí cũ.',
    use:'Card kéo thả, inventory item, UI 2D tương tác.',
    tree:'Canvas\n└── Inventory  (Flexible Layout + UITransform)\n    └── DraggableCard  (UITransform + Interactable + FlexalonObject)',
    steps:['Tạo Inventory với Flexible Layout và UITransform.', 'Thêm child DraggableCard có UITransform và Sprite để nhận chạm.', 'Thêm Flexalon Interactable vào DraggableCard.', 'Đặt Drag Enabled = true.', 'Nhấn Preview, thử kéo child.', 'Sau khi thả, script khôi phục skipLayout ban đầu; layout có thể xếp lại child.'],
    fields:[['dragEnabled','true','Cho phép kéo thả qua pointer.']],
    tips:['Parent cần có UITransform để chuyển đổi tọa độ con trỏ.', 'Drag hiện chỉ làm việc với UI touch/pointer; tính năng reorder bằng cách thả vị trí mới chưa được tích hợp tự động.'],
    task:'Kéo một item ra ngoài hàng rồi thả để xem item trở về layout.'
  },
  {
    id:'FlexalonDragTarget', name:'Drag Target', group:'Hiệu ứng & tương tác', glyph:'⤵', diagram:'drop', time:'4 phút',
    tagline:'Đánh dấu vùng có thể nhận drag & drop',
    intro:'Component chứa cờ Accept Drop để biểu thị vùng nhận node được kéo. Bản port hiện tại chỉ là thành phần nền, chưa có luồng reorder/drop đầy đủ như Unity.',
    use:'Đánh dấu ô đích trong workflow kéo thả.',
    tree:'Canvas\n├── SourceCard  (Interactable)\n└── DropArea  (UITransform + DragTarget)',
    steps:['Tạo UI Node DropArea có UITransform và Sprite hiển thị vùng thả.', 'Thêm Flexalon Drag Target lên DropArea.', 'Bật Accept Drop = true.', 'Tạo SourceCard có Interactable.', 'Kiểm tra trạng thái của DropArea trong logic kéo thả riêng của dự án: component này chưa tự chuyển parent / insert sibling khi drop.'],
    fields:[['acceptDrop','true','Cho phép chấp nhận drop ở cấp cấu hình.']],
    tips:['Bản port v0.5.0 chưa tự kết nối DragTarget với Interactable để hoàn tất drag & drop.', 'Để tạo inventory reorder hoàn chỉnh cần thêm logic nhận diện drop và cập nhật sibling index.'],
    task:'Chuẩn bị DropArea và kiểm tra Accept Drop trong code tương tác riêng.'
  },
  {
    id:'Flexalon', name:'Flexalon Manager', group:'Cơ bản', glyph:'⚙', diagram:'manager', time:'3 phút',
    tagline:'Cấu hình cập nhật Flexalon trong Editor và Runtime',
    intro:'Component quản lý tùy chọn cập nhật của hệ thống Flexalon; các layout cũng có Auto Update riêng.',
    use:'Điều khiển cập nhật hệ thống tổng trong scene.',
    tree:'Canvas\n├── FlexalonManager  (Flexalon)\n└── LayoutRoot  (Flexible/Grid/... Layout)',
    steps:['Tạo node FlexalonManager trong Scene.', 'Thêm component Flexalon (manager).', 'Bật Update In Edit Mode nếu muốn hệ thống được phép chạy trong Editor.', 'Bật Update In Play Mode nếu muốn chạy trong Preview.', 'Trên layout riêng, kiểm tra Auto Update = true.'],
    fields:[['updateInEditMode','true','Cho phép cập nhật trong Scene Editor.'],['updateInPlayMode','true','Cho phép cập nhật trong Preview/Runtime.']],
    tips:['Không nhầm manager với FlexalonObject: manager điều khiển hệ thống, object mô tả từng node.', 'Khi layout không đổi trong Editor, kiểm tra cả Auto Update trên layout và cài đặt manager.'],
    task:'Thử tắt Update In Edit Mode và so sánh kết quả tại Editor.'
  }
];
