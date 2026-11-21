import { useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogCourse } from "../lib/catalogApi";
import {
  formatLessonCount,
  formatPriceLabel,
  formatStartDate,
  formatStudentCount,
} from "../logic/catalog";
import { getCourseLevelLabel } from "../logic/courseEditor";
import { sanitizeCoverUrl } from "../logic/publicCourses";

type CatalogCourseCardProps = {
  course: CatalogCourse;
};

export default function CatalogCourseCard({ course }: CatalogCourseCardProps) {
  const coverUrl = sanitizeCoverUrl(course.anh_dai_dien);
  const [imageFailed, setImageFailed] = useState(false);
  const price = formatPriceLabel(course.gia_vnd);
  const students = formatStudentCount(course.so_hoc_vien);
  const startDate = formatStartDate(course.ngay_khai_giang);
  const meta = [
    course.ten_giao_vien,
    getCourseLevelLabel(course.cap_do),
    course.so_bai_hoc > 0 ? formatLessonCount(course.so_bai_hoc) : null,
    course.thoi_luong,
    startDate ? `Khai giảng ${startDate}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <article className="cat-card" role="listitem">
      <div className="cat-card-thumb">
        {coverUrl && !imageFailed ? (
          <img src={coverUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="cat-card-thumb-fallback" aria-hidden="true">
            {course.tieu_de.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="cat-card-level">{getCourseLevelLabel(course.cap_do)}</span>
        <span className="cat-card-topic">{course.chu_de}</span>
      </div>
      <h3 className="cat-card-title">{course.tieu_de}</h3>
      <p className="cat-card-meta">{meta}</p>
      {students && <p className="cat-card-students">{students}</p>}
          {price && <p className="cat-card-price">{price}</p>}
      <Link className="cat-card-action" to={`/courses/${course.ma_khoa_hoc}`}>
        Xem khóa học
      </Link>
    </article>
  );
}
