export const portfolioLimits = { count: 5, fileBytes: 10 * 1024 * 1024, totalBytes: 30 * 1024 * 1024 };

export function validateTeacherProfile(introduction: string, experience: string, fileCount: number): string | null {
  if (introduction.trim().length < 50 || introduction.trim().length > 1000) return "Giới thiệu cần từ 50 đến 1.000 ký tự.";
  if (experience.trim().length < 10 || experience.trim().length > 2000) return "Kinh nghiệm cần từ 10 đến 2.000 ký tự.";
  if (fileCount < 1 || fileCount > portfolioLimits.count) return "Vui lòng chọn từ 1 đến 5 ảnh tác phẩm.";
  return null;
}

export function validatePortfolioFiles(files: Array<Pick<File, "type" | "size">>, retainedCount = 0): string | null {
  if (files.length + retainedCount > portfolioLimits.count) return "Hồ sơ chỉ được có tối đa 5 ảnh.";
  if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) return "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.";
  if (files.some(file => file.size > portfolioLimits.fileBytes || file.size === 0)) return "Mỗi ảnh cần lớn hơn 0 và không quá 10 MB.";
  if (files.reduce((sum, file) => sum + file.size, 0) > portfolioLimits.totalBytes) return "Tổng dung lượng ảnh không được quá 30 MB.";
  return null;
}
