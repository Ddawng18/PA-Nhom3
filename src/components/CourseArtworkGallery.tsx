import { useEffect, useId, useRef, useState } from "react";
import { sanitizeCoverUrl } from "../logic/publicCourses";
import "../styles/course-artwork.css";

type Props = { teacher: string[]; student: string[]; preview?: boolean };

type ActiveImage = { url: string; label: string };

export default function CourseArtworkGallery({ teacher, student, preview = false }: Props) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<ActiveImage | null>(null);
  const groups = [
    { label: "Tác phẩm giảng viên", images: teacher },
    { label: "Tác phẩm học viên", images: student },
  ].map(({ label, images }) => ({
    label,
    images: images.map(url => preview && url.startsWith("blob:") ? url : sanitizeCoverUrl(url))
      .filter((url): url is string => Boolean(url)),
  })).filter(group => group.images.length > 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (active && dialog && !dialog.open) dialog.showModal();
    else if (!active && dialog?.open) dialog.close();
  }, [active]);

  if (!groups.length) return null;
  return (
    <section className="course-artwork" aria-labelledby={headingId}>
      <div className="course-artwork-heading">
        <div><p className="guest-eyebrow">PORTFOLIO</p><h2 id={headingId}>Tác phẩm của giảng viên và học viên</h2></div>
        <span>{groups.reduce((total, group) => total + group.images.length, 0)} tác phẩm</span>
      </div>
      {groups.map(group => (
        <div key={group.label} className="course-artwork-group">
          <h3>{group.label}</h3>
          <ul>
            {group.images.map((url, index) => (
              <li key={url}>
                <button type="button" className="course-artwork-open" aria-label={`Xem ${group.label.toLowerCase()} ${index + 1}`} onClick={() => setActive({ url, label: `${group.label} · ${index + 1}` })}>
                  <img src={url} alt={`${group.label} ${index + 1}`} loading="lazy" />
                  <span aria-hidden="true">Xem ảnh lớn</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <dialog className="course-artwork-lightbox" ref={dialogRef} aria-label="Xem tác phẩm" onClose={() => setActive(null)}>
        {active && <div>
          <button type="button" className="course-artwork-close" aria-label="Đóng ảnh" onClick={() => dialogRef.current?.close()}>×</button>
          <img src={active.url} alt={active.label} />
          <p>{active.label}</p>
        </div>}
      </dialog>
    </section>
  );
}
