import { Link } from "react-router-dom";
import CourseCover from "./CourseCover";
import AddToCartButton from "./AddToCartButton";
import type { CatalogCourse } from "../lib/catalogApi";
import {
  formatLessonCount,
  formatPriceLabel,
  formatStartDate,
  formatStudentCount,
} from "../logic/catalog";
import { getCourseLevelLabel } from "../logic/courseEditor";
import { isDemoCourse } from "../logic/demoCourses";
import "../styles/courses.css";

type CatalogCourseCardProps = {
  course: CatalogCourse;
};

export default function CatalogCourseCard({ course }: CatalogCourseCardProps) {
  const price = formatPriceLabel(course.gia_vnd);
  const students = formatStudentCount(course.so_hoc_vien);
  const startDate = formatStartDate(course.ngay_khai_giang);
  const teacher = course.ten_giao_vien ?? "Giảng viên LINEA";
  const facts = [
    getCourseLevelLabel(course.cap_do),
    course.so_bai_hoc > 0 ? formatLessonCount(course.so_bai_hoc) : null,
    course.thoi_luong,
    startDate ? `Khai giảng ${startDate}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <article className="cat-card" role="listitem">
      <div className="cat-card-thumb">
        <CourseCover course={course} />
        <span className="cat-card-level">{getCourseLevelLabel(course.cap_do)}</span>
      </div>
      <div className="cat-card-title-row">
        <h3 className="cat-card-title">{course.tieu_de}</h3>
        {isDemoCourse(course) && <span className="cat-card-demo-badge">Khóa mẫu</span>}
        <span className="cat-card-trial-badge">Học thử</span>
      </div>
      <p className="cat-card-teacher">{teacher}</p>
      <p className="cat-card-meta">{facts}</p>
      {students && <p className="cat-card-students">{students}</p>}
      {price && <p className="cat-card-price">{price}</p>}
      <div className="cat-card-actions">
        <Link className="cat-card-action" to={`/courses/${course.ma_khoa_hoc}`}>Xem khóa học</Link>
        <Link className="cat-card-preview" to={`/courses/${course.ma_khoa_hoc}#sample-lesson`} aria-label={`Học thử ${course.tieu_de}`}>
          Học thử
        </Link>
        <AddToCartButton courseId={course.ma_khoa_hoc} />
      </div>
    </article>
  );
}
