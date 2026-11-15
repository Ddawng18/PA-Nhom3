# Kết quả nghiệm thu S6-13–15 — 15/11/2026

## Kết luận

**Chưa đạt nghiệm thu đầy đủ.** Studio có lỗi tọa độ khi hiển thị 360px. Community đạt các ca UI tự động trong môi trường local, chưa có PO duyệt nội dung. Trang Khách chưa nghiệm thu auth/API thật. PR chưa tích hợp, chưa xác nhận deploy.

Người dùng đã yêu cầu “nghiệm thu đi”, cho phép chạy kiểm tra trong lượt này, thay yêu cầu không chạy test trước đó trong phạm vi nghiệm thu S6-13–15. Không tự deploy, áp dụng SQL hoặc đổi dữ liệu dùng chung.

## Phiên bản, môi trường và người thực hiện

- SHA repo bắt đầu nghiệm thu: `ef18bd47f93aa2d69d2342dd02983b9da870ed36`; mã chức năng tương ứng `b8933d1`. Các commit sau b8933d1 đến ef18bd4 chỉ sửa tài liệu. Không sửa mã `src/` trong lượt nghiệm thu này.
- Thực thi tự động: Codex trong phiên người dùng; không có xác nhận reviewer con người/PO.
- Ngày 15/11/2026, khoảng 13:11–13:17 UTC+7 theo log. Thời gian chính xác từng ca lưu UTC trong JSON.
- Windows, Node v24.21.0; Chromium headless 156.0.8078.4; Vite local `http://127.0.0.1:4176`.
- Desktop 1280×900; mobile 360×800; đổi viewport 800×360. Touch dùng CDP giả lập, không phải thiết bị thật.
- Auth không cấu hình; API catalog được Playwright chặn và trả fixture local. Tất cả request ngoài origin bị chặn, gồm Google Fonts; ảnh dùng font fallback của môi trường. Không suy kết quả fixture ra API production.
- SHA BE/schema/deploy không xác nhận; không có token, tài khoản thật hoặc dữ liệu riêng trong các artifact này.
- Đã tìm cấu hình API ở repo gốc và thử GET public `/api/courses?page=1&pageSize=12` không kèm danh tính: kết nối thất bại (`WebException`, không có HTTP status). Không công bố địa chỉ mạng riêng trong báo cáo. Biến môi trường LINEA_TEST_EMAIL/PASSWORD không có trong phiên; chưa có tài khoản nghiệm thu được chỉ định. API thật vẫn BLOCKED; không suy rằng backend có lỗi nghiệp vụ từ việc không kết nối được.

## Kiểm tra nền

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Vitest | PASS — 15 file, 80/80 test | [unit.log](evidence/acceptance-2026-11-15/unit.log) |
| Build | PASS — có cảnh báo bundle JS >500 kB | [build.log](evidence/acceptance-2026-11-15/build.log) |
| Lint trước/sau bổ sung kịch bản nghiệm thu | PASS | [lint.log](evidence/acceptance-2026-11-15/lint.log), [lint-with-acceptance.log](evidence/acceptance-2026-11-15/lint-with-acceptance.log) |

Các kết quả trên không thay thế nghiệm thu chức năng. Build chạy trước khi thêm kịch bản `.mjs`; không có thay đổi mã ứng dụng sau build.

## Kết quả trình duyệt

Tổng hợp **32 mục kiểm tra/điều kiện: 26 PASS local, 1 FAIL, 5 BLOCKED**. Đây là các ca và nhánh con của ma trận, không phải 32 task hoặc 26 ca gốc đã nghiệm thu đầy đủ. PASS gắn đúng giới hạn local/fixture/giả lập của từng dòng.

| Nhóm | Kết quả có bằng chứng |
|---|---|
| ST-01 | PASS: chuột, bút/tẩy, đổi màu/cỡ nét; kiểm tra pixel màu đỏ và vùng tẩy |
| ST-03 | PASS: giới hạn 30 snapshot, undo 29 lần, thao tác mới bỏ redo |
| ST-04 | PASS: hủy xóa giữ tranh, đồng ý xóa, vẽ tiếp |
| ST-05 | PASS: PNG tải về khớp byte với canvas, 1200×720 |
| ST-06 | PASS: link nội bộ hủy giữ tranh, đồng ý điều hướng |
| ST-07 | PASS: Back/Forward cả hủy và đồng ý trên lịch sử có thật |
| ST-08 | PASS: sau xuất sạch; undo cảnh báo, redo về snapshot xuất hết cảnh báo; sửa/xóa lại cảnh báo |
| ST-09 | PASS: beforeunload reload và đóng tab, nhánh ở lại/rời đi trong Chromium headless |
| ST-10 | PASS trong viewport giả lập: giữ pixel sau resize/đổi viewport, không tràn ngang 360px, focus và Enter đổi sang tẩy; chưa xác nhận toàn bộ tổ hợp thiết bị/toolbar |
| ST-02 | FAIL tọa độ màn 360px; touch giả lập có vẽ và không cuộn. Thiết bị thật BLOCKED |
| ST-11 | PASS trong browser context kiểm tra: không request ghi do thao tác Studio |
| GH-01/06/07 | PASS local: URL/reload anonymous, CTA/link, bố cục trang Khách/catalog 360px |
| GH-03/04 | PASS phần UI với fixture: lọc draft/hidden; loading/empty/error/retry. API thật BLOCKED |
| GH-05 | PASS phần DOM anonymous local; cách ly dữ liệu API thật/role thật BLOCKED |
| GH-02 | BLOCKED đăng nhập/đăng xuất thật và giữ ngữ cảnh khóa qua auth |
| CM-01–04 | PASS local: feed/detail, nhãn demo, thích/bỏ thích/reset, bình luận rỗng/hợp lệ/reset, post không tồn tại |
| CM-05 | PASS clipboard copy đúng link; nhánh lỗi được kiểm tra bằng Promise từ chối giả lập, không phải hộp thoại OS |
| CM-06/07 | PASS local: không request ghi, feed/detail 360px không tràn ngang, nhắc dữ liệu nhạy cảm |
| CM-08 | BLOCKED xác nhận duyệt nội dung của Đăng; không ghi thay người duyệt |

## Lỗi cần xử lý

### S6-13-B01 — Nét vẽ lệch vị trí con trỏ trên màn 360px

- Mức độ: Major — không đạt tiêu chí tọa độ khi CSS scale/mobile của S6-13.
- SHA: ef18bd4 (mã chức năng b8933d1).
- Tái hiện: mở `/studio`, viewport 360×800; click canvas tại x=40% chiều rộng, y=25% chiều cao hiển thị. Canvas hiển thị 326×280.
- Mong đợi: tâm nét tại x≈130.4, y≈70 tính từ góc canvas.
- Thực tế: tâm pixel nét x≈130, y≈90.5, lệch dọc ≈20.5px. Tái hiện ở hai lượt chạy.
- Nguyên nhân suy luận từ mã: mobile đặt `min-height:280px; object-fit:contain`; bitmap canvas 1200×720 có vùng trống trong hộp hiển thị, trong khi `point()` quy đổi theo toàn bộ bounding rect.
- Hướng sửa đề xuất: giữ hộp canvas đúng tỷ lệ bitmap hoặc quy đổi tọa độ theo vùng ảnh thực sau object-fit; sau sửa kiểm tra lại các điểm ở trên/giữa/dưới và touch/resize.
- Owner đề xuất: Thịnh; reviewer Phú; mốc đề xuất 17/11, chưa có thành viên xác nhận.
- Bằng chứng: [metrics](evidence/acceptance-2026-11-15/run-2/mobile-coordinate-metrics.json), [ảnh mobile](evidence/acceptance-2026-11-15/run-2/ST-02-scale.png), [ảnh canvas](evidence/acceptance-2026-11-15/run-2/studio-mobile-canvas.png).
- Trạng thái: OPEN, chưa sửa trong lượt nghiệm thu.

## Cách đọc artifact và loại trừ lỗi kịch bản

- [Kết quả tổng hợp](evidence/acceptance-2026-11-15/consolidated-results.json) là nguồn tổng kết; tham chiếu [run-2](evidence/acceptance-2026-11-15/run-2/results.json) và [kiểm tra lại đóng tab](evidence/acceptance-2026-11-15/close-recheck/results.json).
- Lượt đầu có lỗi setup: rời tranh chưa xuất bị chính beforeunload chặn. Các lỗi chuyển ca đó không phải lỗi ứng dụng và không đưa vào kết luận; giữ [log thăm dò](evidence/acceptance-2026-11-15/browser.log) và [JSON thăm dò](evidence/acceptance-2026-11-15/results.json) để truy vết. Ảnh/trace thăm dò giữ local tại `test-results/sprint6-exploratory/`.
- Run-2 khắc phục setup, còn ST-09-close bị lỗi chụp ảnh sau khi tab đã đóng đúng mong đợi. Chạy lại riêng với kịch bản đã sửa: ca đóng tab PASS, kết quả và trace riêng. Không tính lỗi screenshot này là lỗi ứng dụng.
- Trace: [run-2](evidence/acceptance-2026-11-15/run-2/browser-trace.zip), [đóng tab](evidence/acceptance-2026-11-15/close-recheck/browser-trace.zip). Mở bằng Playwright Trace Viewer local.
- [Network](evidence/acceptance-2026-11-15/run-2/network.json): `writes: []`, `pageErrors: []`. Không request ghi trong context đã kiểm tra; không khẳng định mọi môi trường hoặc tích hợp auth đều tương tự.
- [PNG xuất](evidence/acceptance-2026-11-15/run-2/studio-export.png); ảnh từng ca nằm trong thư mục run-2.
- Kịch bản tái chạy: `tests/sprint6.acceptance.mjs`; cần Vite local cổng 4176 với `VITE_API_URL=http://127.0.0.1:4176`. Không cấu hình Supabase thật. `ACCEPTANCE_RUN` chọn thư mục output; `ACCEPTANCE_CASES` lọc ca, ví dụ ST-09-close. Kịch bản cố ý trả exit code 1 khi lỗi tọa độ còn tồn tại.

## Quyết định bàn giao

- S6-13: REVIEW / chưa đạt, cần sửa S6-13-B01 và kiểm tra lại; ca thiết bị thật chưa được xác nhận.
- S6-14: REVIEW / chưa đủ điều kiện tích hợp nghiệm thu auth/API thật; fixture không thay thế API thật.
- S6-15: REVIEW / UI local đạt các ca đã chạy, vẫn cần Đăng duyệt nội dung và reviewer xác nhận; chưa merge/deploy.
- Phát/Phú tiếp nhận kết quả và chốt người sửa/ca còn thiếu. Không đánh DONE hoặc suy phần trăm hoàn thành toàn Sprint.
