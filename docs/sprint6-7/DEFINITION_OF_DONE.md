# Definition of Done — Sprint 6

Ngày lập: 14/11/2026 (UTC+7). Nguồn: kế hoạch `D:\Sprint6.docx`, 15 task S6-01–S6-15; phạm vi 97 giờ công. Chưa thấy DoD chi tiết tương đương trong nhánh PR nên bổ sung tài liệu này. Owner và phụ thuộc giữ theo kế hoạch; owner/reviewer phải xác nhận nhận việc.

Các ô dưới đây là **tiêu chí cần đáp ứng**, không phải kết quả kiểm chứng. Chưa chạy test, migration, restore hoặc deploy trong tác vụ sửa PR. Không đánh dấu đạt dựa vào tài liệu này.

## Quy tắc chung và bằng chứng bắt buộc

- [ ] Task có owner, reviewer, PB/WBS liên quan, PR và SHA; thay đổi FE/BE cùng hợp đồng, không mất chức năng đã có.
- [ ] Build/lint phù hợp đạt hoặc ghi rõ lỗi tồn, tác động và người xử lý. Không coi build thành công là test chức năng pass.
- [ ] API ghi lấy danh tính từ phiên server, kiểm tra quyền/sở hữu/trạng thái; không tin role, giá, điểm hoặc quyền học client gửi.
- [ ] UI có loading, rỗng, lỗi, retry và ngăn submit trùng; dữ liệu mẫu được ghi rõ.
- [ ] Có danh sách ca nghiệm thu gắn từng tiêu chí, kết quả PASS/FAIL/NOT_RUN, môi trường, SHA FE/BE, schema/env và ngày kiểm tra. Không lưu token/mật khẩu/key trong bằng chứng.
- [ ] Database/Storage thay đổi có hướng dẫn áp dụng, tương thích phiên bản, backup/rollback và trạng thái thực tế. Chưa chạy thì ghi chưa áp dụng.
- [ ] Chức năng thay đổi được kiểm tra đúng vai trò và trường hợp từ chối, không chỉ luồng thành công. Có bằng chứng tải lại vẫn giữ dữ liệu khi chức năng yêu cầu lưu.
- [ ] Reviewer xác nhận không còn lỗi nghiêm trọng về mất dữ liệu, lộ dữ liệu hoặc vượt quyền trong phạm vi task.

**Trạng thái:** TODO → DOING → REVIEW → INTEGRATED. Chỉ ghi **DONE** khi đủ tiêu chí và bằng chứng trên bản tích hợp. Có code nhưng chưa chạy phải ghi INTEGRATED/NOT_RUN; không tự công bố phần trăm hoạt động.

Mỗi task lưu bằng chứng trong `docs/sprint6-7/evidence/S6-xx/` khi có thật, gồm:

| Trường | Nội dung phải điền |
|---|---|
| Phiên bản | SHA FE/BE, PR, nhánh, schema, thời điểm và môi trường |
| Người chịu trách nhiệm | Owner thực hiện, reviewer xác nhận |
| Tiêu chí/ca | Mã tiêu chí, tiền điều kiện, bước, đầu ra mong đợi, kết quả thực tế |
| Kết quả | PASS/FAIL/NOT_RUN; ảnh hoặc log đã che thông tin nhạy cảm |
| Tồn đọng | Lỗi, mức độ, owner, hạn xử lý; không dùng “không có” nếu chưa kiểm tra |

## S6-01 — Nền tích hợp (Phát/Phú/Thịnh/Bảo)

- [ ] Chốt `develop` là nhánh tích hợp của PR này, đối chiếu PR #6 với bản hợp nhất, xử lý phần trùng và phần cần giữ.
- [ ] Có route Khách/catalog và học viên/giáo viên/admin; giữ trang học, bài tập, chấm và tiến độ khi hợp nhất giao diện.
- [ ] Bàn giao bảng method/path, auth, request/response/error/version và fixture chỉ dùng phát triển; bản dùng chung lấy API thật.
- [ ] Bằng chứng mở các route bằng URL trực tiếp/tải lại, anonymous và các role; ghi rõ SHA tích hợp.

## S6-02 — Storage bài tập (Bảo/Phú/Thịnh, sau S6-01)

- [ ] GET danh sách bài tập không khởi tạo Storage upload; thiếu cấu hình upload không làm hỏng danh sách.
- [ ] Bucket private đúng môi trường, chỉ nhận JPG/PNG/WEBP ≤10 MB; xác thực chữ ký file phía server.
- [ ] Upload/xem/thay ảnh hoạt động đúng quyền; người khác và anonymous không lấy được ảnh hoặc URL ký.
- [ ] Thiếu env/bucket hoặc Storage lỗi có code/thông báo có kiểm soát; không lộ cấu hình/key.
- [ ] Bucket upload và cleanup dùng cùng cấu hình; bàn giao env không chứa secret cùng bằng chứng áp dụng SQL/policy.

## S6-03 — Hồ sơ tên/avatar (Bảo/Thịnh, sau S6-01)

- [ ] Đọc/lưu hồ sơ qua API, lấy user ID từ phiên; chỉ cập nhật tên/avatar được phép, validation chiều dài/URL.
- [ ] Header/sidebar/settings cùng nguồn; sau lưu hiển thị mới ngay, tải lại vẫn giữ; không để response cũ ghi đè dữ liệu vừa lưu.
- [ ] Request cố tình thêm role/trạng thái không thay đổi các trường đó; client không ghi trực tiếp hoặc sửa hồ sơ người khác.
- [ ] Lưu thất bại giữ dữ liệu nhập và báo lỗi; phiên hết hạn đưa về luồng đăng nhập phù hợp.
- [ ] Bằng chứng API, UI và kiểm tra quyền database sau áp dụng cấu hình; SQLite legacy không được dùng để chứng minh avatar trên Supabase.

## S6-04 — Editor nội dung/media (Bảo/Phú/Thịnh, sau S6-01; Phú review schema)

- [ ] Đọc snapshot nội dung/version và ghi qua API; server kiểm tra đúng giáo viên/khóa NHAP và tham chiếu nội dung con.
- [ ] Lưu chương/bài/bài tập/rubric/attachment/sắp xếp có transaction, giữ ID hiện có; xóa không làm mất tiến độ/bài nộp.
- [ ] Hai tab dùng cùng version: chỉ một lần lưu có hiệu lực, lần còn lại nhận conflict; publication không đua với lưu editor.
- [ ] Upload/xóa media qua backend, đúng bucket/path, loại/chữ ký/kích thước file; lỗi DB/Storage có phương án dọn file và log.
- [ ] Hợp đồng attachment FE/BE thống nhất; thêm/gỡ/tải lại không tạo tham chiếu sai hoặc làm mất file ngoài phạm vi.
- [ ] SQL/schema và thu hồi quyền ghi trực tiếp được review, triển khai theo thứ tự API/FE trước; kiểm chứng bằng role trình duyệt.

## S6-05 — Catalog, ghi danh, học (Bảo/Thịnh, sau S6-01; paid gate sau S6-09)

- [ ] Anonymous xem danh sách khóa công khai/được hiển thị và giới thiệu phù hợp; không thấy khóa nháp/ẩn hoặc nội dung học bảo vệ.
- [ ] Tìm kiếm, lọc theo tiêu chí đã chốt, phân trang có số lượng và trạng thái URL nhất quán; chuyển bộ lọc không giữ trang vượt phạm vi.
- [ ] CTA đăng nhập/ghi danh giữ khóa đích; hủy đăng nhập không tự tạo ghi danh.
- [ ] Free enroll qua backend, request lặp không tạo trùng; ghi danh lại không reset tiến độ.
- [ ] Khóa có giá bị chặn enroll trực tiếp, chỉ được cấp quyền theo S6-09; khi S6-09 chưa sẵn sàng không mở bán trên bản dùng chung.
- [ ] My Courses/dashboard/tiếp tục học mở đúng course/lesson; chọn bài trước/sau và tải lại URL vẫn đúng.
- [ ] Nội dung/video/ảnh thực tế hiển thị đúng; đánh dấu học hoàn thành lưu được, không giả xác minh xem hết video.
- [ ] Bằng chứng gồm Khách → đăng nhập → free enroll → học → tiếp tục; từ chối lesson khác khóa, khóa ẩn và người chưa ghi danh.

## S6-06 — Nộp bài, chấm và xem kết quả (Bảo/Thịnh, sau S6-02)

- [ ] Học viên có ghi danh hợp lệ nộp đúng một JPG/PNG/WEBP ≤10 MB; server chặn sai chữ ký, rỗng, quá cỡ và assignment khác quyền.
- [ ] Được thay ảnh trước hạn và trước chấm; hết hạn/đã chấm nhận lỗi nghiệp vụ, giữ bài cũ. File thay thế được dọn sau commit.
- [ ] Người nộp và giáo viên sở hữu khóa xem ảnh private bằng quyền server; người khác không đọc được dù biết ID/path.
- [ ] Giáo viên xem danh sách đúng khóa, lọc trạng thái, chấm 0–10 với nhận xét bắt buộc; server chặn sai role/chủ, điểm ngoài khoảng và nhận xét rỗng.
- [ ] Sửa điểm yêu cầu version, giữ lịch sử điểm/nhận xét/người sửa/thời điểm; stale request trả 409 và UI hướng dẫn tải lại.
- [ ] Học viên thấy điểm/nhận xét mới sau tải lại; thông báo đúng người, liên kết đúng bài; không trùng thông báo do bấm lại ngoài quy tắc đã chốt.
- [ ] Bằng chứng nộp → thay → chấm → sửa → học viên xem, hai tab chấm và tình huống Storage/DB lỗi; ghi rõ object tồn cần dọn.

## S6-07 — Tiến độ và hoàn thành (Phú/Thịnh, sau S6-06)

- [ ] Backend, SQL và UI cùng quy tắc: xong tất cả bài học bắt buộc và **nộp đủ bài tập bắt buộc**, không chờ chấm, không ngưỡng điểm đậu.
- [ ] Quy định rõ khóa không có bài bắt buộc trước khi chấm trạng thái; tránh phép chia 0 và tự hoàn thành sai.
- [ ] Hiển thị tiến độ chương/toàn khóa và số bài tập đã nộp; tách phần trăm bài học khỏi trạng thái hoàn thành khóa nếu cần.
- [ ] Dashboard, My Courses, learning và trang progress dùng cùng nguồn, cùng cách làm tròn và cùng trạng thái sau tải lại.
- [ ] Nộp đủ nhưng chưa chấm vẫn hoàn thành; thiếu một bài bắt buộc chưa hoàn thành; chấm/sửa điểm không làm mất hoàn thành hợp lệ.
- [ ] SQL cập nhật dữ liệu cũ không xóa/reset tiến độ/bài/điểm, giữ DA_HUY; có số liệu trước/sau và phương án khôi phục.
- [ ] Bằng chứng đầy đủ ca không bài tập/có bài tập/bài tùy chọn/nộp chưa chấm; migration chưa chạy phải ghi NOT_RUN.

## S6-08 — Quản trị tài khoản và ẩn/hiện khóa (Phú/Thịnh, sau S6-01)

- [ ] Supabase mode có API users thật, tìm/lọc/phân trang/chi tiết; không còn 501 hoặc dữ liệu mock cho luồng quản trị.
- [ ] Admin khóa/mở tài khoản kèm lý do và lịch sử actor/thời điểm/trước-sau; không tự khóa mình, không xóa cứng, không đổi role qua form hồ sơ.
- [ ] Khóa có hiệu lực request tiếp theo kể cả token/phiên cũ; frontend xử lý mất quyền và không tiếp tục ghi bằng dữ liệu cache.
- [ ] Admin ẩn/hiện khóa có lý do/lịch sử; public catalog và endpoint học/nộp tôn trọng trạng thái từ request tiếp theo.
- [ ] Khóa/ẩn không xóa dữ liệu, ghi danh, tiến độ, ảnh hoặc điểm; mở lại hiển thị dữ liệu đã giữ theo nghiệp vụ.
- [ ] Người không phải admin không dùng được API bằng sửa URL/body; UI xác nhận đúng đối tượng và lỗi không giả thành công.
- [ ] Bằng chứng với admin, student, teacher, token trước khóa và request đang dùng khóa bị ẩn; Phú review schema/quyền.

## S6-09 — Thanh toán mô phỏng (Bảo/Phú/Thịnh, sau S6-04/05)

- [ ] Giá VND được đặt khi NHAP, validation phía server, admin duyệt cùng khóa; khóa đã đăng không sửa giá/nội dung.
- [ ] Mỗi đơn một khóa, giá/tên khóa được backend chốt từ nguồn tin cậy; sửa giá/user/status trong client không thay đổi quyền học.
- [ ] Checkout và mọi trang liên quan ghi rõ **DEMO — KHÔNG THU TIỀN THẬT**; không nhận thẻ hoặc giả tích hợp cổng thật.
- [ ] Có thành công/thất bại/hủy với state machine đã chốt; chỉ confirm thành công hợp lệ mới cấp quyền, atomically cùng cập nhật đơn.
- [ ] Confirm idempotent, xử lý bấm lại/hai request đồng thời không tạo nhiều đơn/quyền/ghi danh; giữ tiến độ cũ khi đã ghi danh.
- [ ] Free enroll vẫn hoạt động; paid enroll không bypass checkout bằng gọi API trực tiếp, request lỗi không cấp quyền một phần.
- [ ] Học viên xem lịch sử/chi tiết đơn của mình; admin đọc đơn theo phạm vi, không lộ đơn người khác.
- [ ] Bằng chứng free/paid, 3 kết quả demo, request lặp, hai tab, đơn người khác và lỗi giữa transaction; Phú review quyền/schema.

## S6-10 — Lỗi, loading, rỗng và mất quyền (Bảo/Phú/Thịnh, làm kèm S6-02–09)

- [ ] API nghiệp vụ trả code ổn định, thông báo tiếng Việt, status phù hợp và traceId tra được log; không lộ stack/SQL/secret.
- [ ] Phân biệt 401 hết phiên, 403 mất quyền, 404 đối tượng không tồn tại/không công khai, 409 conflict, validation và lỗi dịch vụ.
- [ ] Mỗi màn có loading, empty chỉ khi tải thành công không có dữ liệu, error/retry khi lỗi; không biến lỗi thành danh sách rỗng hoặc thành công.
- [ ] Retry chỉ tự động cho thao tác an toàn; thao tác ghi cần idempotency/quy tắc rõ, ngăn double submit.
- [ ] Khi logout/đổi tài khoản/route, response cũ không ghi đè dữ liệu mới hoặc làm lộ cache người trước.
- [ ] Mất quyền/khóa/ẩn trong khi mở trang được xử lý ở request tiếp theo; UI giữ dữ liệu nhập khi phù hợp, có hướng dẫn tiếp tục.
- [ ] Bằng chứng tối thiểu loading, rỗng thật, mạng lỗi, timeout, retry hồi phục, conflict và phiên hết hạn trên các luồng liên quan.

## S6-11 — Release/schema/env, hướng dẫn và demo (Phú/Phát/Đăng, soạn song song)

- [ ] Checklist ghi SHA FE/BE, nhánh/repo đích, schema/migration, bucket, biến env (chỉ tên), CORS và thứ tự rollout/rollback.
- [ ] Kiểm tra các script cũ không ghi đè quyền mới; có người áp dụng, thời điểm, môi trường và kết quả thực tế. Secret chuyển qua kênh riêng.
- [ ] Có kế hoạch backup/restore, vị trí/retention, người chịu trách nhiệm, bước phục hồi và tiêu chí đối chiếu số liệu/quyền sau restore.
- [ ] Chỉ ghi restore đạt sau khi phục hồi thử trên môi trường riêng với minh chứng; chưa chạy ghi NOT_RUN, không suy từ có backup file.
- [ ] Ma trận FR/PB/WBS → task → PR → ca → bằng chứng đủ bốn actor, quyền ảnh, conflict, file, khóa/ẩn và đơn demo.
- [ ] Hướng dẫn thao tác theo role và kịch bản demo có tiền điều kiện/dữ liệu demo, thời lượng dự kiến, cách xử lý lỗi và giới hạn thật.
- [ ] Người nhận làm theo hướng dẫn với đúng phiên bản; kết quả còn thiếu có owner/hạn xử lý và chuyển Sprint 7 rõ ràng.

## S6-12 — Review, tích hợp và release candidate (Phát/Phú/Thịnh/Bảo, sau các gói đưa vào release)

- [ ] Tất cả PR đưa vào RC có owner/reviewer, phạm vi rõ, giải quyết conflict và không còn review blocker chưa xử lý.
- [ ] `develop` chứa đúng commit được chọn; không chỉ có mã trên nhánh cá nhân. Chốt SHA FE/BE/schema để Sprint 7 tiếp nhận.
- [ ] Đối chiếu từng DoD và bằng chứng, ghi INTEGRATED/NOT_RUN cho phần chưa nghiệm thu; không đánh Done hàng loạt theo merge.
- [ ] Có bảng lỗi tồn gồm tái hiện, ảnh hưởng, severity, owner/hạn và quyết định đưa/không đưa vào RC.
- [ ] Đánh giá trọng số đúng kế hoạch 100 điểm, tách điểm mã đã tích hợp và điểm đã xác minh; không đổi trọng số để tăng điểm.
- [ ] Các điều kiện bắt buộc về luồng học–nộp–chấm–xem, quyền dữ liệu, paid gate và mất dữ liệu đạt mới công bố bản sẵn sàng.
- [ ] Bàn giao RC ngày 18/11, tiếp nhận 19/11 theo lịch kế hoạch hoặc ghi quyết định đổi lịch; deploy thực tế phải ghi riêng.

## S6-13 — Studio vẽ (Thịnh/Phú, sau S6-01)

- [ ] Khách/người đăng nhập mở Studio và vẽ thật bằng Canvas/Pointer Events; bút, tẩy, màu, cỡ nét hoạt động.
- [ ] Undo/redo có giới hạn lịch sử, thao tác mới sau undo xóa redo hợp lý; xóa tranh có xác nhận và có thể tiếp tục vẽ.
- [ ] Chuột/cảm ứng đúng tọa độ khi CSS scale, resize và đổi hướng; không cuộn trang trong vùng vẽ, không mất nét khi resize.
- [ ] Xuất PNG khớp tranh; thông báo khi rời trang có tranh chưa xuất; không hứa khôi phục sau đóng tab.
- [ ] Dùng được ở 360px và desktop, toolbar thao tác được bằng bàn phím; không tải asset ngoài làm canvas không xuất được.
- [ ] Không tự upload/nộp bài/hoàn thành khóa/đăng feed. PNG phải qua form nộp bài và kiểm tra quyền/file hiện có.
- [ ] Bằng chứng chuột/cảm ứng, undo/redo/xóa/resize/xuất; không tính đạt nếu chỉ có UI công cụ.

## S6-14 — Dashboard Khách (Thịnh, sau S6-01/05)

- [ ] Có route/link rõ, tái dùng giao diện Khách và catalog công khai; không lẫn dashboard tiến độ học viên.
- [ ] Hiển thị tổng quan, cách học, khóa/cấp độ, CTA khám phá/đăng ký và liên kết Studio/xã hội demo đúng route thực tế.
- [ ] Khóa lấy API thật; có loading/empty/error/retry; khóa nháp/ẩn không xuất hiện.
- [ ] Không hiện dữ liệu cá nhân/điểm/tiến độ/thông báo hoặc số liệu giả như dữ liệu thật; ảnh minh họa được trình bày đúng tính chất.
- [ ] Đăng nhập/ghi danh từ CTA giữ ngữ cảnh; layout 360px không tràn ngang.
- [ ] Bằng chứng anonymous mới, đăng nhập/đăng xuất và API lỗi; kiểm tra dữ liệu riêng không có trong response/DOM.

## S6-15 — UI xã hội DEMO (Thịnh/Đăng, sau S6-01)

- [ ] Có feed/chi tiết bài, tác giả và bình luận mẫu; route `/community` và `/community/:postId` hoặc route tương đương đã bàn giao.
- [ ] Nhãn luôn rõ: **DEMO — DỮ LIỆU MẪU, TƯƠNG TÁC KHÔNG ĐƯỢC LƯU** trên cả feed và chi tiết.
- [ ] Thích/bình luận/chia sẻ chỉ trong bộ nhớ, tải lại reset; không ghi database, gửi tin, tạo thông báo hoặc tự chia sẻ ra ngoài.
- [ ] Nhắc không nhập thông tin nhạy cảm nếu có ô bình luận; xử lý bài không tồn tại và nội dung trống phù hợp.
- [ ] Ảnh có quyền sử dụng và nguồn bàn giao; không lấy ảnh bài nộp private. Tác giả/số tương tác mẫu có nhãn.
- [ ] Đăng duyệt nội dung/kịch bản; giao diện 360px dùng được; bằng chứng Network không có request ghi khi thao tác demo.
- [ ] Chỉ nghiệm thu UI demo, không mô tả như cộng đồng thật; tối đa 2 điểm đúng kế hoạch.

## Điểm cần giữ nguyên khi bàn giao Sprint 7

- Hoàn thành khóa không chờ chấm (S6-07); code/SQL cũ còn chờ chấm phải được xử lý trong task này.
- Thanh toán chỉ demo; không triển khai thu tiền thật, hoàn tiền/chi trả, giỏ hàng/mã giảm giá.
- Studio không lưu cloud; xã hội không có chức năng đăng/tương tác thật.
- Chưa được chỉ định chạy kiểm thử thì giữ NOT_RUN; kế hoạch ca không thay thế kết quả thực thi.
