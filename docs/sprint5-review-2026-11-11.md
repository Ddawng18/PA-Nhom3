# Đối chiếu Sprint 5 — 11/11/2026

> Đây là ảnh chụp trạng thái trước khi bổ sung mã. Kết quả xử lý tiếp theo nằm trong [nhật ký triển khai](sprint5-implementation-log.md); deploy do PM tự thực hiện, chưa xác nhận production hoàn tất.

## Kết luận

Chưa đủ điều kiện xác nhận hoàn thành Sprint 5. Mã nguồn đã được tích hợp vào `develop`; frontend gửi hồ sơ giáo viên chưa có trong các nhánh đã kiểm tra, tích hợp khóa học chưa thống nhất, backend deploy chưa có các endpoint mới. Trạng thái Trello là thông tin theo dõi, không thay thế nghiệm thu.

Nguồn: `Ke_hoach_Sprint_5_7_theo_Trello/sprint 5.docx` trong workspace và [board Trello](https://trello.com/b/Ex87ViRC), đọc ngày 11/11/2026. Không chỉnh trạng thái thẻ.

## Đối chiếu 10 đầu việc

| WBS | Công việc | Trello hiện tại | Bằng chứng và phần còn thiếu |
| --- | --- | --- | --- |
| 2.3.2 | API gửi hồ sơ giáo viên | Code review | Có `TeacherProfileController`, upload ảnh riêng tư, validation và smoke test cục bộ. Chưa xác minh trên deploy; `/api/teacher/profile/me` trả 404. |
| 2.3.3 | UI gửi hồ sơ giáo viên và nối API | In Progress | Chưa tìm thấy trang/form gửi hồ sơ hoặc luồng gọi API gửi hồ sơ trong mã nguồn đã tích hợp. Hook đọc trạng thái duyệt không thay thế form gửi hồ sơ. |
| 2.10.1 | Phân tích nộp ảnh bài vẽ | In Review | Chưa tìm thấy tài liệu phân tích chuyên biệt PB10 trong repo. Cần kiểm tra tài liệu BA/đính kèm ngoài repo và hoàn tất review; chưa kết luận tài liệu ngoài repo không tồn tại. |
| 2.4.2 | API duyệt/từ chối giáo viên | Code review | Có `AdminTeacherProfilesController`, cập nhật vai trò, lịch sử, thông báo và test cục bộ. Chưa xác minh trên deploy. |
| 2.4.3 | UI duyệt/từ chối và nối API | Done | Có `ApprovalsPanel` trong Settings gọi backend qua `adminApi.ts`; có thêm `/admin/teachers` từ Front-End. Trang riêng ghi trực tiếp Supabase và chỉ đổi trạng thái hồ sơ, không gọi workflow backend để thăng vai trò/lưu lịch sử/thông báo. Cần thống nhất luồng và nghiệm thu end-to-end. |
| 2.5.2 | API tạo/sửa khóa học | Done | Có `CoursesController`, `CourseService`, migration và phân quyền/chủ sở hữu. Chưa có ca kiểm thử API khóa học trong smoke suite hiện hành; chưa xác minh deploy. |
| 2.11.1 | Phân tích xem bài nộp, nhận xét/chấm điểm | In Review | Chưa tìm thấy tài liệu phân tích chuyên biệt PB11 trong repo. Cần kiểm tra tài liệu BA ngoài repo và kết quả review. |
| 2.5.3 | UI tạo/sửa khóa học và nối API | In Review | Có form, hook, validation và unit test. `useCourseEditor` ghi trực tiếp bảng `khoa_hoc`/`chuong`/`bai_hoc` trên Supabase; backend quản lý bảng `courses` qua `/api/courses`. Chưa thống nhất hợp đồng và nguồn dữ liệu. |
| 2.7.2 | API danh sách khóa học | Done | Có GET `/api/courses`, phân trang/tìm kiếm. Deploy hiện trả 404. `CourseService` dùng `ILike` và sắp xếp `DateTimeOffset`; chưa kiểm thử endpoint trên cả PostgreSQL và SQLite, không coi smoke test hồ sơ là test API khóa học. |
| 2.20.4 | Deploy bản thử | In Review | Frontend gốc và `/admin/teachers` trả HTTP 200 (SPA fallback, không chứng minh trang mới đang có trong bundle). `/api/health` trả 200 với auth connected; `/api/courses`, `/api/teacher/profile/me`, `/api/admin/teacher-profiles` trả 404. Cần deploy bản tích hợp rồi kiểm thử có xác thực. |

## Kiểm tra tích hợp

- Frontend: production build và ESLint thành công; Vitest **56/56**, 8 file.
- Backend: build thành công; smoke suite **34/34**, sử dụng SQLite tạm và dữ liệu test cục bộ.
- Máy có .NET runtime 10, dự án target .NET 9. Chạy smoke bằng `DOTNET_ROLL_FORWARD=Major`; chưa kiểm thử bằng runtime .NET 9 trên máy này.
- Sửa kỳ vọng test token cũ sau khi duyệt giáo viên: phải trả 401 theo cơ chế vô hiệu hóa token sau đổi vai trò đã có trên main. Test tiếp tục đăng nhập lại để kiểm tra quyền giáo viên và ảnh riêng tư.
- Giữ tab phê duyệt của Thịnh khi gộp UI admin riêng, đồng thời giữ trường vai trò tài khoản của Front-End.
- Các kiểm tra deploy chỉ đọc HTTP, không tạo tài khoản hay thay đổi dữ liệu production. Chưa nghiệm thu giao diện so với Figma, chưa xác minh schema/RLS thật hoặc review của thành viên nhóm.

## Đồng bộ Git

- `main` giữ nguyên tại `9c07dca5cb305b3b778139af810814a77239c95d`.
- Backup lịch sử trước xử lý: `D:\QLDA\PA-Nhom3-before-sync-20261111.bundle`.
- `Devsop` không có thay đổi riêng cần giữ so với lịch sử main hiện tại, đưa về main.
- Backend: chuyển các commit `35a2723`, `444b825`, `27e91ac`, `278cd56` lên main hiện tại, giữ tác giả gốc.
- Thinh: chuyển phần frontend từ merge `eab722a` so với parent thứ hai (baseline cũ `6950fe7`), sau đó `d1df6fb`, `a8aa5c8`, `8ddf367`, rồi merge backend mới. Cách này giữ nội dung frontend và không kéo lịch sử main cũ vào.
- Back-End trước xử lý đã merge Thinh và có cùng nội dung với Thinh, nên giữ trạng thái tích hợp tương ứng trên nền main mới.
- Front-End: chuyển snapshot `081277b` so với baseline cũ `6950fe7` thành một commit trên main; commit ghi rõ nguồn snapshot. Commit gốc chứa cả frontend kế thừa từ Thịnh và màn admin mới, nên không cherry-pick toàn bộ patch so với parent lịch sử rất cũ.
- Giữ schema đã phục hồi trên main và tài liệu hiện hành; xử lý xung đột cấu hình Vercel, env, tài liệu, test, Sidebar, router và Settings.
- `develop` merge các nhánh mới. Các nhánh tính năng cùng dùng main làm tổ tiên; vẫn có commit chức năng riêng sau main, không buộc mọi đầu nhánh bằng main vì như vậy sẽ mất thay đổi mới.

## Việc cần hoàn tất

1. Hoàn thiện UI gửi hồ sơ giáo viên và tích hợp API.
2. Chốt một luồng duyệt giáo viên, bảo đảm cập nhật vai trò và tác dụng phụ nhất quán.
3. Thống nhất mô hình dữ liệu/API khóa học giữa frontend và backend; kiểm thử API khóa học.
4. Cung cấp và review tài liệu BA PB10/PB11.
5. Deploy bản tích hợp, kiểm thử end-to-end với tài khoản student/admin/teacher và lưu minh chứng trước khi xác nhận Done.
