# Problem Statement

## 1. Problem Statement

Vẽ là lĩnh vực học chuyên biệt với người học đa dạng: người vẽ theo sở thích, học sinh luyện thi các ngành năng khiếu và người muốn theo nghề minh họa, concept art. Hiện nay họ chủ yếu tự học qua video miễn phí rải rác hoặc theo lớp trực tiếp. Lớp trực tiếp thường tập trung ở thành phố lớn, học phí cao, lịch cố định; khóa trực tuyến linh hoạt hơn nhưng ít nơi có giáo viên xem và nhận xét bài vẽ của từng học viên. Hậu quả là người học khó biết mình sai ở đâu, thiếu lộ trình rõ ràng nên dễ bỏ dở, còn giáo viên giỏi khó tiếp cận học viên ngoài khu vực mình dạy.

Người dùng mục tiêu gồm học viên, giáo viên và quản trị viên. Nhóm đề xuất website học vẽ theo lộ trình, nơi học viên xem bài giảng, nộp bài vẽ và nhận nhận xét, điểm từ giáo viên thực tế đã được xác minh; hệ thống không dùng AI để dạy hay chấm bài. Giá trị kỳ vọng là học viên tiến bộ nhờ phản hồi cá nhân, giáo viên có công cụ chấm bài tiết kiệm thời gian.

> Lưu ý: các nhận định trên là giả định ban đầu, nhóm chưa phỏng vấn hay khảo sát; sẽ kiểm chứng trong Sprint đầu.

## 2. Mô tả người dùng mục tiêu

| Nhóm người dùng | Nhu cầu chính | Khó khăn hiện tại |
| --- | --- | --- |
| Học viên | Lộ trình học rõ ràng, bài tập thực hành, nhận xét hữu ích từ giáo viên | Tự học qua video rời rạc; khó biết mình sai ở đâu; lớp trực tiếp học phí cao, lịch cố định |
| Giáo viên | Công cụ dạy và chấm bài trực tuyến, tiết kiệm thời gian | Khó tiếp cận học viên ngoài khu vực; nhận xét bài tốn nhiều thời gian |
| Quản trị viên | Duyệt giáo viên, quản lý người dùng và nội dung | Cần cơ chế xác minh giáo viên để giữ chất lượng |

## 3. Chọn đề tài

Nhóm so sánh hai đề tài theo 6 tiêu chí và chọn PA-6.

- **Đề tài 1 (PA-6):** nền tảng web học vẽ trực tuyến theo lộ trình, do giáo viên thực tế giảng dạy và nhận xét. **Được chọn.**
- **Đề tài 2:** hệ thống quản lý câu lạc bộ sinh viên (đăng ký sự kiện, quản lý thành viên), STT 8 trong danh sách gợi ý. **Dự phòng.**

| Tiêu chí | Đề tài 1: PA-6 - Web học vẽ | Đề tài 2: Quản lý CLB sinh viên |
| --- | --- | --- |
| Vấn đề có thực tế không? | Có khả năng cao: ít nơi có giáo viên nhận xét từng bài vẽ. Hiện là giả định, cần kiểm chứng bằng khảo sát | Có khả năng cao: CLB thường quản lý bằng Google Form, Excel, Zalo. Cần kiểm chứng |
| Người dùng mục tiêu có rõ ràng không? | Rõ: học viên, giáo viên, quản trị viên. Tuy nhiên người học phân tán thành nhiều nhóm nhu cầu | Rất rõ: thành viên, ban chủ nhiệm CLB, đơn vị quản lý hoạt động sinh viên |
| Có thể khảo sát hoặc thu thập bằng chứng không? | Được, nhưng khó hơn: phải tìm người học vẽ và giáo viên vẽ | Dễ: có thể phỏng vấn ngay chủ nhiệm CLB trong trường |
| Có khả thi trong thời gian học không? | Khả thi nếu giữ phạm vi 7 chức năng; phụ thuộc nội dung từ giáo viên thật | Khả thi, phạm vi quen thuộc |
| Có thể xây dựng MVP không? | Được: đăng nhập, khóa học, nộp bài, chấm bài | Được: đăng ký sự kiện, điểm danh, danh sách thành viên |
| Nhóm có đủ kiến thức để thực hiện không? | Đủ phần web cơ bản; nội dung dạy vẽ phải nhờ giáo viên bên ngoài | Đủ, ít phụ thuộc bên ngoài |

## 4. Năm câu hỏi bắt buộc

1. **Tại sao chọn PA-6 thay vì đề tài khác?** Lĩnh vực học vẽ có ít nền tảng làm tốt phần nhận xét cá nhân của giáo viên nên nhóm thấy có chỗ để tạo khác biệt. Nhóm chấp nhận rủi ro phụ thuộc vào giáo viên thật và sẽ giảm bằng cách liên hệ sớm.
2. **Vấn đề có thực sự tồn tại hay chỉ là giả định?** Hiện mới là giả định dựa trên quan sát của nhóm, chưa có khảo sát. Nhóm sẽ kiểm chứng trong Sprint đầu.
3. **Ai đang gặp vấn đề này?** Người học vẽ (theo sở thích, luyện thi năng khiếu, theo nghề) và giáo viên vẽ muốn dạy trực tuyến nhưng thiếu công cụ nhận xét hiệu quả.
4. **Bằng chứng nào có thể thu thập?** Phỏng vấn 3-5 học viên và 1-2 giáo viên; khảo sát nhỏ ở câu lạc bộ mỹ thuật và các nhóm vẽ trên mạng xã hội; đối chiếu với nền tảng tương tự như ArtWod. Tất cả là kế hoạch, chưa thực hiện.
5. **Nếu không có phần mềm, người dùng giải quyết thế nào?** Xem video miễn phí, học lớp trực tiếp, hoặc gửi bài cho giáo viên qua Zalo/Facebook (rời rạc, khó theo dõi tiến độ).

## 5. Giả định cần xác minh

1. Người học thật sự muốn nhận xét cá nhân từ giáo viên.
2. Có ít nhất 2-3 giáo viên hoặc họa sĩ đồng ý cung cấp nội dung mẫu.
3. Giáo viên chấp nhận quy trình chấm bài trên web.
4. Nhóm tìm đủ người dùng thử (mục tiêu 20 người).
5. Học viên sẵn sàng học qua web thay vì trao đổi bài qua Zalo/Facebook.
