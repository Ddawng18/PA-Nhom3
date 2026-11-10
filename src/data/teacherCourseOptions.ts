export const courseLevels = ["Cơ bản", "Trung cấp", "Nâng cao"] as const;
export const courseStatuses = ["Bản nháp", "Chờ duyệt", "Đã xuất bản"] as const;

export const sampleTeacherCourse = {
  tieu_de: "Vẽ nhân vật từ hình khối cơ bản",
  cap_do: "Cơ bản",
  chu_de: "Minh họa nhân vật",
  mo_ta: "Làm quen với cách xây dựng nhân vật từ những hình khối đơn giản.",
  anh_dai_dien: "",
  trang_thai: "Bản nháp",
  chuong: [
    {
      id: "sample-chapter-1",
      tieu_de: "Làm quen với hình khối",
      thu_tu: 1,
      bai_hoc: [
        {
          id: "sample-lesson-1",
          tieu_de: "Quan sát hình khối cơ bản",
          thu_tu: 1,
          noi_dung_van_ban: "Nhận biết hình tròn, hình vuông và hình tam giác trong cấu trúc nhân vật.",
          duong_dan_anh: "",
          lien_ket_video: "",
          bat_buoc: true,
        },
      ],
    },
  ],
} as const;
