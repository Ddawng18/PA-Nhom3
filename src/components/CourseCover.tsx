import { useState } from "react";
import type { CatalogCourse } from "../lib/catalogApi";
import { sanitizeCoverUrl } from "../logic/publicCourses";
import "../styles/course-cover.css";

type CoverCourse = Pick<CatalogCourse, "ma_khoa_hoc" | "tieu_de" | "chu_de" | "anh_dai_dien"> & { kieu_bia?: string };

const tones = ["forest", "clay", "indigo", "sun"] as const;

export default function CourseCover({ course, className = "" }: { course: CoverCourse; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const coverUrl = sanitizeCoverUrl(course.anh_dai_dien);
  const tone = tones.includes(course.kieu_bia as typeof tones[number])
    ? course.kieu_bia as typeof tones[number]
    : tones[Math.abs(course.ma_khoa_hoc) % tones.length];
  const variant = Math.abs(course.ma_khoa_hoc) % 3;

  return <div className={`course-cover course-cover-${tone} course-cover-variant-${variant} ${className}`.trim()}>
    {coverUrl && !imageFailed ? (
      <img src={coverUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
    ) : (
      <svg className="course-cover-art" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect className="course-cover-field" width="400" height="225" />
        <circle className="course-cover-orb" cx={variant === 0 ? 304 : variant === 1 ? 92 : 318} cy={variant === 0 ? 66 : 96} r={variant === 2 ? 88 : 64} />
        <path className="course-cover-arc" d={variant === 0 ? "M-20 178C72 98 154 110 222 168S352 218 430 152" : variant === 1 ? "M-20 84C76 160 168 156 242 104S354 24 430 90" : "M-20 148C96 72 164 206 284 118S372 42 430 92"} />
        <path className="course-cover-arc course-cover-arc-soft" d={variant === 0 ? "M-20 202C88 132 166 144 238 196S360 236 430 190" : variant === 1 ? "M-20 112C88 188 174 182 252 132S360 54 430 118" : "M-20 176C104 100 178 228 296 146S384 74 430 122"} />
        <g className="course-cover-grid">
          <path d="M22 196h74M22 184h74M22 172h74M22 160h74" />
          <path d="M318 30v52M306 30v52M294 30v52" />
        </g>
        <rect className="course-cover-block" x={variant === 1 ? 286 : 42} y={variant === 2 ? 28 : 38} width="34" height="34" rx="4" />
        <circle className="course-cover-dot" cx="342" cy="178" r="7" />
        <circle className="course-cover-dot course-cover-dot-small" cx="358" cy="196" r="3.5" />
      </svg>
    )}
    <span className="course-cover-topic">{course.chu_de}</span>
    <span className="course-cover-mark" aria-hidden="true">{String(course.ma_khoa_hoc).padStart(2, "0")}</span>
  </div>;
}
