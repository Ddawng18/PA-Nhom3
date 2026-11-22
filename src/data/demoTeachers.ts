export type DemoTeacherCourse = {
  title: string;
  level: string;
  lessons: number;
  summary: string;
};

export type DemoTeacherPortfolio = {
  label: string;
  caption: string;
  tone: "forest" | "clay" | "indigo" | "sand";
};

export type DemoTeacher = {
  slug: string;
  name: string;
  handle: string;
  initials: string;
  title: string;
  tone: "forest" | "clay" | "indigo" | "sand";
  location: string;
  experience: string;
  languages: string[];
  specialties: string[];
  bio: string[];
  approach: string[];
  availability: string;
  responseTime: string;
  portfolio: DemoTeacherPortfolio[];
  courses: DemoTeacherCourse[];
};

export const demoTeachers: DemoTeacher[] = [
  {
    slug: "nmratist",
    name: "NmRAtist",
    handle: "@nmratist",
    initials: "N",
    title: "Character illustrator & color study",
    tone: "forest",
    location: "TP. Hồ Chí Minh",
    experience: "8 năm kinh nghiệm minh họa",
    languages: ["Tiếng Việt", "English"],
    specialties: ["Nhân vật", "Màu sắc", "Digital painting"],
    bio: [
      "NmRAtist tập trung vào minh họa nhân vật có cá tính, ánh sáng và bảng màu giàu cảm xúc. Phong cách giảng dạy đi từ hình khối lớn, tỷ lệ và ánh sáng trước khi đi vào chi tiết.",
      "Hồ sơ này là dữ liệu minh họa cho bản thử nghiệm LINEA, không phải hồ sơ giáo viên thật hay lời giới thiệu đã được xác minh.",
    ],
    approach: [
      "Bắt đầu bằng silhouette và hình khối lớn, sau đó mới thêm chi tiết.",
      "Dùng bài tập màu giới hạn để học cách kiểm soát sắc độ.",
      "Phản hồi theo 3 lớp: bố cục, ánh sáng, chất liệu.",
    ],
    availability: "Nhận phản hồi mẫu vào thứ Ba và thứ Năm",
    responseTime: "Phản hồi minh họa trong 48 giờ",
    portfolio: [
      { label: "01", caption: "Nghiên cứu nhân vật", tone: "forest" },
      { label: "02", caption: "Bảng màu giới hạn", tone: "clay" },
      { label: "03", caption: "Ánh sáng buổi sớm", tone: "indigo" },
      { label: "04", caption: "Chất liệu vải", tone: "sand" },
    ],
    courses: [
      { title: "Màu kỹ thuật số cho minh họa", level: "Cơ bản", lessons: 8, summary: "Vòng màu, sắc độ và phối màu cho nhân vật." },
      { title: "Nhân vật và nét viền", level: "Trung cấp", lessons: 6, summary: "Xây dựng hình khối và nét viền có chủ đích." },
    ],
  },
  {
    slug: "mai-an",
    name: "Mai An",
    handle: "@maian.studio",
    initials: "MA",
    title: "Environment & lighting artist",
    tone: "indigo",
    location: "Đà Nẵng",
    experience: "6 năm kinh nghiệm minh họa",
    languages: ["Tiếng Việt"],
    specialties: ["Bối cảnh", "Ánh sáng", "Phối cảnh"],
    bio: [
      "Mai An xây dựng bối cảnh từ cảm giác không gian trước khi vẽ chi tiết. Các bài học minh họa tập trung vào phối cảnh, lớp trước/sau và ánh sáng kể chuyện.",
      "Hồ sơ này là dữ liệu minh họa cho bản thử nghiệm LINEA; không phải giáo viên thật.",
    ],
    approach: [
      "Chốt điểm nhìn và đường chân trời trước khi dựng hình.",
      "Dùng 3 giá trị sáng/tối để kiểm tra khối không gian.",
      "Gợi ý bài tập quan sát ngoài trời mỗi tuần.",
    ],
    availability: "Nhận phản hồi mẫu vào cuối tuần",
    responseTime: "Phản hồi minh họa trong 72 giờ",
    portfolio: [
      { label: "01", caption: "Phố buổi sớm", tone: "sand" },
      { label: "02", caption: "Cây và bóng đổ", tone: "forest" },
      { label: "03", caption: "Không gian trong nhà", tone: "indigo" },
      { label: "04", caption: "Ánh sáng hoàng hôn", tone: "clay" },
    ],
    courses: [
      { title: "Phối cảnh cho người mới", level: "Cơ bản", lessons: 7, summary: "Điểm nhìn, đường chân trời và tỷ lệ không gian." },
      { title: "Ánh sáng kể chuyện", level: "Trung cấp", lessons: 5, summary: "Dùng ánh sáng để dẫn mắt và tạo cảm xúc." },
    ],
  },
  {
    slug: "linh-chi",
    name: "Linh Chi",
    handle: "@linhchi.lines",
    initials: "LC",
    title: "Storyboard & composition",
    tone: "clay",
    location: "Hà Nội",
    experience: "5 năm kinh nghiệm storyboard",
    languages: ["Tiếng Việt", "English"],
    specialties: ["Bố cục", "Storyboard", "Kể chuyện"],
    bio: [
      "Linh Chi giúp người học nhìn một bức tranh như một chuỗi quyết định: điểm nhìn, nhịp điệu, khoảng trống và hướng mắt. Hồ sơ mẫu tập trung vào bố cục trước khi đi vào rendering.",
      "Hồ sơ này là dữ liệu minh họa cho bản thử nghiệm LINEA; không phải giáo viên thật.",
    ],
    approach: [
      "Dựng thumbnail đen trắng trước khi chọn màu.",
      "Kiểm tra hướng mắt bằng 3 điểm nhấn.",
      "Phản hồi bằng ghi chú trực tiếp trên thumbnail.",
    ],
    availability: "Nhận phản hồi mẫu vào thứ Hai",
    responseTime: "Phản hồi minh họa trong 48 giờ",
    portfolio: [
      { label: "01", caption: "Nhịp điệu đường chéo", tone: "clay" },
      { label: "02", caption: "Khoảng trống", tone: "sand" },
      { label: "03", caption: "Storyboard 3 khung", tone: "forest" },
      { label: "04", caption: "Hướng mắt", tone: "indigo" },
    ],
    courses: [
      { title: "Bố cục tranh kể chuyện", level: "Trung cấp", lessons: 6, summary: "Dẫn mắt, nhịp điệu và khoảng trống." },
      { title: "Storyboard đầu tiên", level: "Cơ bản", lessons: 5, summary: "Chuyển ý tưởng thành chuỗi khung hình." },
    ],
  },
];

export function findDemoTeacher(slug: string | undefined) {
  return demoTeachers.find(teacher => teacher.slug === slug);
}
