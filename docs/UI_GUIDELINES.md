# Frontend UI Engineering Guidelines

## Impeccable visual quality

Review GG Maps follows the visual language documented in the repository root files
`PRODUCT.md` and `DESIGN.md`. These files are the product and design source of
truth for future UI work.

- Avoid generic AI-generated patterns: purple/blue gradients, decorative glow,
  glassmorphism, nested cards, repeated icon-card grids and gradient text.
- Establish hierarchy with typography, spacing, dividers and alignment before
  adding containers or decorative effects.
- Use a deliberate visual direction tied to Review GG Maps' promise of transparent
  Review GG Maps' Google Maps evaluation, evidence and outcomes.
- Keep brand surfaces and operational dashboard surfaces distinct: the homepage
  persuades with evidence; dashboards optimize scanning and action.
- Use specific, plain Vietnamese copy. Avoid generic startup buzzwords and
  redundant labels.
- Use `Be Vietnam Pro` as the single approved UI font. It must be explicitly
  loaded with Vietnamese glyph support in `index.html`; use the fallback stack
  `Segoe UI`, `Noto Sans`, `Arial`, sans-serif. Do not switch Vietnamese UI
  headings to Georgia, Times New Roman or another unapproved serif font.
- Before handoff, perform an Impeccable-style review for hierarchy, cognitive
  load, typography, contrast, responsive behavior and anti-patterns. If the
  optional CLI is available, `npx impeccable detect src/` may be used as an
  additional diagnostic.

Tài liệu này là UI contract bắt buộc của Review GG Maps. Mục tiêu là tạo giao diện nhất quán, dễ sử dụng, accessible, responsive và có khả năng mở rộng lâu dài.

## 1. Responsive theo hướng mobile-first

- Giao diện phải dùng được từ 320px trở lên; không xuất hiện horizontal scroll ngoài chủ đích.
- Viết style mặc định cho mobile, sau đó mở rộng bằng `min-width` media query.
- Không thiết kế riêng theo tên thiết bị. Breakpoint được chọn tại điểm layout thực sự bị vỡ.
- Kiểm tra tối thiểu tại 320px, 375px, 768px, 1024px và 1440px.
- Ưu tiên layout linh hoạt với Grid, Flexbox, `%`, `min()`, `max()` và `clamp()`; tránh width/height cố định cho content.
- Ảnh và media phải responsive (`max-width: 100%`) và khai báo tỷ lệ để hạn chế layout shift.
- Vùng tương tác trên thiết bị cảm ứng nên có kích thước tối thiểu 44×44px.
- Không ẩn nội dung hoặc chức năng quan trọng trên mobile chỉ để layout gọn hơn.

## 2. Accessibility là tiêu chí hoàn thành

- Ưu tiên semantic HTML: `button` cho hành động, `a` cho điều hướng, đúng thứ tự heading.
- Mọi chức năng phải sử dụng được chỉ bằng bàn phím.
- Focus indicator phải nhìn thấy rõ; không dùng `outline: none` nếu không có thay thế tương đương.
- Input phải có label; lỗi validation phải chỉ rõ nguyên nhân và cách khắc phục.
- Ảnh nội dung phải có `alt`; ảnh trang trí dùng `alt=""`.
- Không truyền tải ý nghĩa chỉ bằng màu sắc. Text và control phải có độ tương phản phù hợp WCAG AA.
- ARIA chỉ dùng khi semantic HTML chưa giải quyết được vấn đề.
- Tôn trọng `prefers-reduced-motion`; animation không được cản trở thao tác.

## 3. Design system và tính nhất quán

- Ant Design là nền tảng UI mặc định. Ưu tiên dùng component và pattern chính thức trước khi tạo component riêng.
- Theme toàn ứng dụng được quản lý tại `src/app/theme/antdTheme.js` và cung cấp qua `ConfigProvider`; không tạo theme cục bộ tùy tiện trong từng page.
- Dùng `@ant-design/icons` cho icon giao diện. Icon phải có accessible name khi truyền tải ý nghĩa và `aria-hidden` khi chỉ mang tính trang trí.
- Wrapper trong `shared/ui` chỉ được tạo khi cần chuẩn hóa API, accessibility hoặc hành vi dùng lặp lại; không bọc component chỉ để đổi tên.
- Không override class nội bộ hoặc class hash của Ant Design. Dùng component token, semantic class/styles API, CSS Modules trên wrapper hoặc API chính thức của component.
- Feedback dùng đúng pattern: `Form.Item` cho field error, `Alert` cho lỗi trong vùng nội dung, `message` cho phản hồi ngắn và `notification` cho sự kiện cần lưu ý lâu hơn.
- Dùng token trong `src/app/styles/tokens.css` cho màu, spacing, typography, radius, shadow và z-index.
- Không hard-code giá trị lặp lại trong component nếu giá trị đó thuộc ngôn ngữ thiết kế chung.
- Component dùng chung nằm trong `shared/ui`; component chứa nghiệp vụ nằm trong `features` hoặc `entities` tương ứng.
- Component phải có API nhỏ, rõ ràng. Ưu tiên composition thay vì nhiều boolean prop khó hiểu.
- Không tạo shared component sau lần sử dụng đầu tiên. Chỉ trích xuất khi đã thấy pattern ổn định hoặc có từ hai nơi sử dụng thực tế.
- Giữ visual hierarchy nhất quán: một primary action rõ ràng cho mỗi vùng chức năng.

## 4. Trạng thái và trải nghiệm người dùng

- Luồng gọi dữ liệu phải xem xét đủ: initial, loading, success, empty, error và retry.
- Form phải xem xét: pristine, dirty, validating, invalid, submitting, success và server error.
- Không để người dùng bấm submit lặp khi request đang chạy.
- Loading ngắn không nên gây nhấp nháy; loading dài cần feedback rõ ràng. Skeleton phải gần với layout thật.
- Error message phải hữu ích, đặt gần nơi xảy ra lỗi và không làm mất dữ liệu người dùng đã nhập.
- Thao tác phá huỷ phải có mức xác nhận tương ứng với khả năng phục hồi.
- Giữ trạng thái quan trọng trong URL khi cần chia sẻ hoặc quay lại, ví dụ search, filter, sort và pagination.

## 5. Nội dung và localization

- UI text phải ngắn, cụ thể và nhất quán về thuật ngữ.
- Không ghép câu bằng nhiều chuỗi nhỏ nếu nội dung có khả năng dịch.
- Layout phải chịu được text dài hơn bản thiết kế; không cắt nội dung quan trọng bằng ellipsis.
- Format ngày, số và tiền tệ qua utility dùng chung hoặc `Intl`, không format thủ công.
- Không giả định tên người dùng, địa chỉ hay số tiền luôn ngắn.

## 6. Hiệu năng

- Đặt mục tiêu Core Web Vitals tốt; tránh layout shift và JavaScript không cần thiết.
- Lazy-load theo route hoặc feature lớn, không lazy-load mọi component nhỏ.
- Chọn đúng định dạng và kích thước ảnh; chỉ preload tài nguyên thực sự quan trọng.
- Tránh render lại do object/function được tạo không cần thiết, nhưng không memo hóa khi chưa có bằng chứng.
- Danh sách dài phải phân trang, infinite loading có kiểm soát hoặc virtualize tùy use case.
- Không thêm dependency chỉ để giải quyết một utility nhỏ có thể viết và kiểm thử dễ dàng.

## 7. CSS và layout

- CSS Modules chịu trách nhiệm layout và phần nhận diện riêng của sản phẩm; không sao chép CSS để tái tạo component Ant Design đã có.
- Khi dùng responsive API của Ant Design, vẫn phải xác minh ở viewport bắt buộc và tránh render hai DOM tree desktop/mobile nếu CSS có thể giải quyết.
- CSS của component dùng CSS Modules; global CSS chỉ dành cho reset, token và style nền toàn ứng dụng.
- Selector giữ specificity thấp, không dùng `!important` trừ trường hợp tích hợp bên thứ ba có giải thích.
- Không style dựa vào cấu trúc DOM mong manh như chuỗi selector lồng sâu.
- Dùng logical properties (`margin-inline`, `padding-block`) khi phù hợp.
- z-index phải theo token/layer có chủ đích, không tăng số tùy tiện.
- Animation ưu tiên `transform` và `opacity`; tránh animate thuộc tính gây layout liên tục.

## 8. Component và data flow

- Component chỉ nên có một trách nhiệm chính; tách logic nghiệp vụ khỏi presentational UI khi logic bắt đầu phức tạp.
- State đặt gần nơi sử dụng nhất. Chỉ đưa lên global state nếu nhiều vùng độc lập thực sự cần dùng chung.
- Không gọi API trực tiếp từ shared UI component.
- API response cần được chuyển đổi về domain model tại boundary thay vì để shape backend lan khắp UI.
- Không lưu derived state nếu có thể tính an toàn từ props/state hiện tại.
- Mọi effect phải có lý do đồng bộ với hệ thống bên ngoài; không dùng effect thay cho event handler hoặc derived value.

## 9. Chất lượng và kiểm thử

- Ưu tiên test hành vi người dùng thay vì implementation detail.
- Luồng quan trọng cần integration test: authentication, search/filter, cart/checkout và review submission khi được phát triển.
- Bug fix nên đi kèm regression test nếu có thể tái hiện ổn định.
- Không merge UI chỉ dựa trên happy path.
- Không để warning hoặc error trong console ở luồng bình thường.

## 10. Definition of Done cho UI task

Một UI task chỉ hoàn thành khi:

- Đúng yêu cầu và không phá vỡ luồng hiện có.
- Responsive ở các kích thước kiểm tra bắt buộc.
- Dùng được bằng keyboard, focus rõ, semantic HTML hợp lý.
- Có đầy đủ trạng thái liên quan và nội dung lỗi hữu ích.
- Không có horizontal overflow, layout shift rõ rệt hoặc console error.
- Dùng design token và đúng ranh giới kiến trúc.
- `npm run lint` và `npm run build` đều pass.
- Có test tương xứng với mức độ rủi ro của thay đổi.

## Checklist review nhanh

- [ ] Mobile 320px không vỡ layout hay mất chức năng.
- [ ] Tablet và desktop tận dụng không gian hợp lý.
- [ ] Keyboard navigation và focus state hoạt động.
- [ ] Loading, empty, error và retry đã được xử lý.
- [ ] Text dài, dữ liệu thiếu và dữ liệu cực trị không phá UI.
- [ ] Không hard-code token dùng chung hoặc thêm dependency không cần thiết.
- [ ] Không có console error; lint và build pass.
