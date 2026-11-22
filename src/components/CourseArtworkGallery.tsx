import { useId } from "react";
import { sanitizeCoverUrl } from "../logic/publicCourses";
import "../styles/course-artwork.css";

type Props = { teacher: string[]; student: string[]; preview?: boolean };

export default function CourseArtworkGallery({ teacher, student, preview = false }: Props) {
  const headingId = useId();
  const groups = [
    { label: "Tác phẩm giảng viên", images: teacher },
    { label: "Tác phẩm học viên", images: student },
  ].map(({ label, images }) => ({
    label,
    images: images.map(url => preview && url.startsWith("blob:") ? url : sanitizeCoverUrl(url))
      .filter((url): url is string => Boolean(url)),
  })).filter(group => group.images.length > 0);

  if (!groups.length) return null;
  return (
    <section className="course-artwork" aria-labelledby={headingId}>
      <h2 id={headingId}>Tác phẩm của giảng viên và học viên</h2>
      {groups.map(group => (
        <div key={group.label} className="course-artwork-group">
          <h3>{group.label}</h3>
          <ul>
            {group.images.map((url, index) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`${group.label} ${index + 1}`} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
