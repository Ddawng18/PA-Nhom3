import type { CatalogCourse } from "../lib/catalogApi";

type ProofCourse = Pick<CatalogCourse, "tieu_de" | "chu_de" | "cap_do">;

const topicOutcomes: Record<string, string[]> = {
  "Vẽ cơ bản": [
    "Dựng hình từ khối lớn trước khi đi vào chi tiết",
    "Kiểm soát độ đậm nhạt và nhịp nét",
    "Đặt tỷ lệ và đường chân trời có chủ đích",
    "Tự đánh giá bài vẽ bằng checklist ngắn",
  ],
  "Màu sắc": [
    "Chọn bảng màu có vai trò rõ ràng",
    "Điều tiết sắc độ để giữ khối và ánh sáng",
    "Dùng màu nóng - lạnh để dẫn mắt",
    "Tiết chế độ bão hòa ở vùng phụ",
  ],
  "Minh họa nhân vật": [
    "Xây dựng dáng và silhouette dễ đọc",
    "Giữ tỷ lệ đầu - thân nhất quán",
    "Dùng nét viền để phân tầng không gian",
    "Thể hiện biểu cảm qua hình khối lớn",
  ],
  "Phong cảnh": [
    "Dựng phối cảnh bằng lớp trước - sau",
    "Chọn điểm tụ và đường dẫn mắt",
    "Đơn giản hóa chi tiết theo khoảng cách",
    "Dùng sắc độ để tạo không khí",
  ],
};

const topicFeedback: Record<string, string> = {
  "Vẽ cơ bản": "“Khối lớn đã đúng hướng. Hãy giảm lực tay ở phần nét dựng để bước vào chi tiết sạch hơn.”",
  "Màu sắc": "“Bảng màu đã có điểm nhấn. Thử hạ độ bão hòa ở nền để vùng sáng trên nhân vật nổi rõ hơn.”",
  "Minh họa nhân vật": "“Dáng đọc tốt, nhưng vai đang cao hơn trục đầu. Hạ vai một chút và kiểm tra lại silhouette ở lần thu nhỏ.”",
  "Phong cảnh": "“Đường dẫn mắt đã rõ. Giữ chi tiết xa mờ hơn để lớp gần có chỗ đứng.”",
};

const levelFocus: Record<string, string> = {
  CO_BAN: "nền tảng",
  TRUNG_CAP: "kiểm soát",
  NANG_CAO: "biểu đạt",
};

export function getCourseOutcomes(course: ProofCourse) {
  return topicOutcomes[course.chu_de] ?? [
    "Quan sát và chọn điểm nhấn trước khi vẽ",
    "Chia bài vẽ thành các lớp dễ kiểm soát",
    "Luyện tập có mục tiêu trong Studio",
    "Nhận phản hồi để điều chỉnh ở bài tiếp theo",
  ];
}

export function getCourseSample(course: ProofCourse, firstLessonTitle?: string | null) {
  const focus = levelFocus[course.cap_do] ?? "luyện tập";
  return {
    title: firstLessonTitle || `Làm quen với ${course.chu_de.toLowerCase()}`,
    intro: `Bài mẫu tập trung vào ${focus} của chủ đề ${course.chu_de.toLowerCase()}, với một bài tập nhỏ có thể hoàn thành trong 15–20 phút.`,
    exercise: "Chọn một vật thể hoặc nhân vật đơn giản, dựng ba lớp: khối lớn, sắc độ, rồi chi tiết. Giữ bài vẽ đủ nhỏ để nhìn được toàn bộ bố cục.",
    checklist: ["Đọc được hình khối lớn", "Có một điểm nhấn rõ", "Sắc độ không lẫn vào nền", "Nét vẽ có chủ đích"],
  };
}

export function getCourseFeedback(course: ProofCourse) {
  return topicFeedback[course.chu_de] ?? "“Bố cục đã rõ. Hãy chọn một điểm nhấn duy nhất và giảm chi tiết ở vùng phụ để mắt có nơi dừng.”";
}
