const demoCourseIds = new Set([4, 5, 6, 7, 8, 9, 10, 11]);
const demoTeacherNames = new Set(["Teacher Demo", "ThinhTester"]);

export function isDemoCourse(course: { ma_khoa_hoc: number; ten_giao_vien?: string | null }) {
  return demoCourseIds.has(course.ma_khoa_hoc)
    || (course.ten_giao_vien ? demoTeacherNames.has(course.ten_giao_vien) : false);
}
