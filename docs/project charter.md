# Project Charter

Project Charter thống nhất mục tiêu, phạm vi sơ bộ, nguồn lực và định hướng triển khai của dự án, gồm đủ 16 thành phần theo yêu cầu của đề bài.

## 1. Project Title

PA-6: Nền tảng web học vẽ trực tuyến theo lộ trình, do giáo viên thực tế giảng dạy và nhận xét (tên tạm).

## 2. Background

Số người học vẽ nghiêm túc và số giáo viên có chuyên môn đều ít hơn nhiều so với các mảng như ngoại ngữ hay tin học; nhu cầu bị phân tán theo từng nhóm người học. Người học hiện tự học qua video rải rác hoặc theo lớp trực tiếp. ArtWod là một hình mẫu nhóm tham khảo. PA-6 tập trung vào chất lượng cho nhóm người học nhỏ, với số khóa ít nhưng có lộ trình rõ ràng và giáo viên được xác minh.

## 3. Business Need / Problem

Ít nền tảng trực tuyến có giáo viên xem và nhận xét bài vẽ của từng học viên, trong khi nhận xét cá nhân là yếu tố giúp người học tiến bộ. Đây là giả định của nhóm, sẽ được kiểm chứng ở Sprint đầu.

## 4. Target Users

Học viên; giáo viên vẽ; quản trị viên.

## 5. Project Goal

Xây dựng website chuyên biệt cho người học vẽ, giúp học theo lộ trình từ cơ bản đến nâng cao, thực hành qua bài tập và nhận phản hồi trực tiếp từ giáo viên thực tế.

## 6. Project Objectives (SMART)

- **Cụ thể:** website có 5 nhóm chức năng: khóa học và bài học video; bài tập và nộp bài vẽ; nhận xét, chấm điểm bởi giáo viên; hồ sơ và tiến độ học; quản lý hồ sơ giáo viên.
- **Đo lường:** tối thiểu 10 user story ưu tiên cao hoàn thành; ít nhất 3 khóa học mẫu (mỗi khóa từ 5 bài); từ 80% test case chức năng chính đạt; 100% bài nộp được giáo viên nhận xét; demo ổn định với 20 người dùng thử.
- **Khả thi:** nhóm 5 người, công nghệ web phổ biến (ví dụ ReactJS, Node.js hoặc .NET, MySQL hoặc PostgreSQL), làm theo Scrum, Sprint 1 tuần.
- **Phù hợp:** đáp ứng mục tiêu môn học (áp dụng Agile/Scrum) và nhu cầu của người học vẽ.
- **Thời hạn:** hoàn thành sản phẩm demo trước khi kết thúc môn học.

## 7. Major Deliverables

- Website 3 vai trò (học viên, giáo viên, quản trị viên).
- Tối thiểu 3 khóa học mẫu, mỗi khóa từ 5 bài, do giáo viên thực tế cung cấp.
- Module nộp bài và chấm bài; trang quản trị.
- Bộ tài liệu dự án: charter, backlog, test case; báo cáo demo.

## 8. Initial Scope (In scope)

1. Đăng ký, đăng nhập, phân quyền 3 vai trò.
2. Quản lý khóa học và bài học (video, hình ảnh, mô tả) do giáo viên đăng tải.
3. Học viên nộp bài vẽ (tải ảnh lên); giáo viên xem, nhận xét và chấm điểm.
4. Theo dõi tiến độ học, cấp chứng nhận hoàn thành khóa học.
5. Tìm kiếm, lọc khóa học theo cấp độ và chủ đề.
6. Hồ sơ giáo viên và quy trình quản trị viên duyệt, xác minh giáo viên trước khi đăng khóa học.
7. Trang quản trị: quản lý người dùng, giáo viên, khóa học, nội dung.

## 9. Out of Scope

1. Dùng AI để dạy vẽ (bài giảng, hướng dẫn, gợi ý chỉnh sửa, nhận xét, chấm điểm); toàn bộ do giáo viên thực tế thực hiện.
2. Ứng dụng di động.
3. Thanh toán thật (chỉ mô phỏng nếu cần).
4. Livestream lớp học.
5. Công cụ vẽ trực tiếp trên web.

## 10. Key Stakeholders

Học viên; giáo viên; quản trị viên; giảng viên môn học; PCG; nhóm phát triển (chi tiết ở `stakeholder-register.md`).

## 11. Constraints

- **Thời gian:** theo lịch môn học; Sprint 1 tuần.
- **Chi phí:** gần như bằng 0, dùng hosting và công cụ miễn phí.
- **Nhân lực:** 5 sinh viên, đồng thời học các môn khác.
- **Công nghệ:** công nghệ web phổ biến, nhóm đã quen hoặc học nhanh được.
- **Nội dung:** nội dung giảng dạy mẫu phải do giáo viên thực tế cung cấp hoặc xác nhận.

## 12. Assumptions

Các giả định ở `problem-statement.md`: người học muốn nhận xét cá nhân; có 2-3 giáo viên hoặc họa sĩ cung cấp nội dung; giáo viên chấp nhận quy trình chấm trên web; tìm đủ người dùng thử; học viên sẵn sàng học qua web.

## 13. High-Level Risks

- Phạm vi phình to trong quá trình làm.
- Thiếu giáo viên hoặc nội dung mẫu thật.
- Khó tìm đủ người dùng thử.
- Giáo viên cung cấp nội dung hoặc chấm bài chậm.
- Thành viên bận thi, chưa quen Scrum, dẫn đến trễ tiến độ.

## 14. Success Criteria

- 10 user story ưu tiên cao hoàn thành.
- 3 khóa học mẫu, mỗi khóa từ 5 bài.
- Từ 80% test case chức năng chính đạt.
- 100% bài nộp có nhận xét của giáo viên.
- Demo ổn định với 20 người dùng thử.

## 15. Project Manager
Trần Đại Phát.
