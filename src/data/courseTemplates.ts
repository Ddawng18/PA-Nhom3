import type { CourseLevel } from "../logic/courseEditor";

export type CourseTemplate = {
  id: string;
  name: string;
  level: CourseLevel;
  topic: string;
  duration: string;
  description: string;
  chapters: Array<{ title: string; lessons: Array<{ title: string; content: string }> }>;
};

export const courseTemplates: CourseTemplate[] = [
  {
    id: "foundation",
    name: "Nền tảng hình khối",
    level: "CO_BAN",
    topic: "Vẽ cơ bản",
    duration: "4 tuần",
    description: "Lộ trình nhập môn tập trung vào quan sát, dựng khối lớn và kiểm soát sắc độ trước khi đi vào chi tiết.",
    chapters: [
      {
        title: "Quan sát và dựng khối",
        lessons: [
          { title: "Đọc hình khối lớn", content: "Chia vật thể thành hộp, cầu và trụ. Dựng bằng nét nhẹ trước khi chốt tỷ lệ." },
          { title: "Dựng hộp và cầu", content: "Luyện ba góc nhìn của một khối hộp, sau đó chuyển sang khối cầu với trục sáng tối." },
          { title: "Bài luyện: ba vật thể", content: "Sắp ba vật thể có kích thước khác nhau và dựng toàn bộ bố cục trong 20 phút." },
        ],
      },
      {
        title: "Sắc độ và bố cục",
        lessons: [
          { title: "Ba vùng sắc độ", content: "Tách bài vẽ thành vùng sáng, trung gian và tối. Giữ nét dựng mờ để so sánh." },
          { title: "Đường dẫn mắt", content: "Dùng hướng cạnh, độ tương phản và khoảng trống để dẫn mắt đến điểm nhấn." },
          { title: "Bài luyện tổng hợp", content: "Hoàn thiện một bài tĩnh vật nhỏ với checklist: khối lớn, sắc độ, điểm nhấn, nét có chủ đích." },
        ],
      },
    ],
  },
  {
    id: "character",
    name: "Minh họa nhân vật",
    level: "TRUNG_CAP",
    topic: "Minh họa nhân vật",
    duration: "6 tuần",
    description: "Xây dựng nhân vật có silhouette rõ, tỷ lệ nhất quán và biểu cảm đọc được ở nhiều kích thước.",
    chapters: [
      {
        title: "Dáng và tỷ lệ",
        lessons: [
          { title: "Silhouette dễ đọc", content: "Thử 10 dáng nhân vật chỉ bằng một màu, kiểm tra độ rõ khi thu nhỏ." },
          { title: "Trục đầu - thân", content: "Dựng trục đầu, vai, hông trước khi thêm trang phục và chi tiết." },
          { title: "Bài luyện: ba dáng", content: "Vẽ ba dáng đứng, ngồi và chuyển động, giữ cùng một tỷ lệ nhân vật." },
        ],
      },
      {
        title: "Biểu cảm và trang phục",
        lessons: [
          { title: "Biểu cảm qua hình khối", content: "Bắt đầu từ hướng mắt, lông mày và độ nghiêng đầu thay vì vẽ chi tiết khuôn mặt." },
          { title: "Nếp gấp có mục đích", content: "Chọn ba điểm kéo căng của trang phục để mô tả dáng và chất liệu." },
          { title: "Bài luyện: nhân vật có câu chuyện", content: "Hoàn thiện một nhân vật kèm ba từ khóa tính cách và một bối cảnh ngắn." },
        ],
      },
    ],
  },
  {
    id: "color-light",
    name: "Màu sắc và ánh sáng",
    level: "TRUNG_CAP",
    topic: "Màu sắc",
    duration: "5 tuần",
    description: "Kiểm soát bảng màu, sắc độ và ánh sáng để bài minh họa có điểm nhấn rõ mà không bị rối.",
    chapters: [
      {
        title: "Bảng màu có vai trò",
        lessons: [
          { title: "Chọn màu chủ đạo", content: "Chọn một màu chủ đạo, một màu phụ và một điểm nhấn. Ghi rõ vai trò từng màu." },
          { title: "Nóng - lạnh", content: "Dùng tương phản nóng lạnh để tách lớp trước và lớp sau." },
          { title: "Bài luyện: ba bảng màu", content: "Vẽ cùng một bố cục với ba bảng màu khác nhau, giữ nguyên sắc độ." },
        ],
      },
      {
        title: "Ánh sáng và không khí",
        lessons: [
          { title: "Nguồn sáng chính", content: "Xác định hướng sáng, vùng lõi tối và ánh sáng phản xạ trước khi tô màu." },
          { title: "Độ bão hòa theo khoảng cách", content: "Giảm độ bão hòa và tương phản ở lớp xa để tạo không khí." },
          { title: "Bài luyện tổng hợp", content: "Hoàn thiện một bài có một nguồn sáng rõ, ba lớp không gian và một điểm nhấn màu." },
        ],
      },
    ],
  },
];
