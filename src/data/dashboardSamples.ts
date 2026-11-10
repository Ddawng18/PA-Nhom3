export const dashboardSamples = {
  practice: {
    label: "BÀI LUYỆN HÔM NAY",
    title: "Gesture và nhịp điệu",
    description: "Vẽ 5 dáng, mỗi dáng 60 giây. Tập trung vào đường hành động và nhịp chuyển động.",
  },
  inspiration: {
    eyebrow: "CẢM HỨNG HÔM NAY · NGHIÊN CỨU fanart",
    title: "Lynae",
    source: "Wuthering Waves · KURO GAMES",
    action: "Cùng nghiên cứu nét vẽ hôm nay ↗",
    image: "/images/dashboard/inspiration.png",
  },
  streakDays: 7,
  savedWorks: 4,
  recentWorks: [
    {
      title: "Thang độ dày nét",
      meta: "Hôm nay · 12 nét",
      style: "line-weight",
    },
    {
      title: "Nghiên cứu hình khối — hình cơ bản",
      meta: "Hôm qua · 3 hình khối",
      style: "basic-shapes",
    },
    {
      title: "Nghiên cứu dáng nhân vật",
      meta: "Bài nghiên cứu dáng · ví dụ luyện tập",
      style: "figure-study",
    },
  ],
} as const;
