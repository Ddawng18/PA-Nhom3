import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock3, Compass, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PublicHeader from "../components/PublicHeader";
import { listCatalogCourses, getCatalogCourse, type CatalogCourse } from "../lib/catalogApi";
import { requestAdminApi } from "../lib/adminApi";
import { setPageMeta } from "../lib/seo";
import { parseCatalogQuery } from "../logic/catalog";
import {
  learnerGoals,
  learnerLevels,
  practiceTimes,
  saveLearnerProfile,
  type LearnerGoal,
  type LearnerLevel,
  type PracticeTime,
} from "../logic/learnerOnboarding";
import "../styles/onboarding.css";

export default function OnboardingPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<LearnerGoal>("habit");
  const [level, setLevel] = useState<LearnerLevel>("CO_BAN");
  const [practiceTime, setPracticeTime] = useState<PracticeTime>("15");
  const [courses, setCourses] = useState<CatalogCourse[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageMeta({
      title: "Thiết lập lộ trình học · LINEA",
      description: "Chọn mục tiêu, trình độ và thời gian luyện tập để LINEA gợi ý bài học đầu tiên.",
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listCatalogCourses(parseCatalogQuery(""), controller.signal)
      .then((data) => { if (!controller.signal.aborted) setCourses(data.items); })
      .catch(() => { if (!controller.signal.aborted) setCourses([]); });
    return () => controller.abort();
  }, []);

  async function start() {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    const saved = saveLearnerProfile(user.id, { goal, level, practiceTime });
    if (!saved) {
      setError("Không thể lưu lộ trình trên trình duyệt này. Bạn vẫn có thể tiếp tục học.");
    }
    if (session?.access_token) {
      void requestAdminApi("/api/lifecycle/welcome", { token: session.access_token, method: "POST" }).catch(() => undefined);
    }
    const recommended = courses?.find((course) => course.cap_do === level) ?? courses?.[0];
    if (!recommended) {
      navigate("/courses", { replace: true });
      return;
    }
    try {
      const detail = await getCatalogCourse(String(recommended.ma_khoa_hoc));
      const firstLesson = detail.chuong.flatMap((chapter) => chapter.bai_hoc)[0];
      navigate(firstLesson
        ? `/courses/${recommended.ma_khoa_hoc}/learn/${firstLesson.ma_bai_hoc}`
        : `/courses/${recommended.ma_khoa_hoc}`, { replace: true });
    } catch {
      navigate(`/courses/${recommended.ma_khoa_hoc}`, { replace: true });
    }
  }

  const recommendation = courses?.find((course) => course.cap_do === level) ?? courses?.[0];
  const selectedGoal = learnerGoals.find((item) => item.value === goal);
  const selectedLevel = learnerLevels.find((item) => item.value === level);
  const selectedTime = practiceTimes.find((item) => item.value === practiceTime);

  return <div className="register-page onboarding-page">
    <PublicHeader authLink={{ to: "/dashboard", label: "Tổng quan" }} />
    <main className="onboarding-main">
      <section className="onboarding-hero" aria-labelledby="onboarding-title">
        <p className="guest-eyebrow">BẮT ĐẦU CÙNG LINEA</p>
        <h1 id="onboarding-title">Thiết lập lộ trình của bạn</h1>
        <p>Ba câu hỏi ngắn để chọn bài học đầu tiên phù hợp. Bạn có thể đổi lại bất cứ lúc nào.</p>
      </section>

      <div className="onboarding-layout">
        <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); void start(); }}>
          <fieldset className="onboarding-section">
            <legend><Target aria-hidden="true" size={18} /> Bạn muốn đạt được gì?</legend>
            <div className="onboarding-options">
              {learnerGoals.map((item) => <label className={`onboarding-option${goal === item.value ? " is-selected" : ""}`} key={item.value}>
                <input type="radio" name="goal" value={item.value} checked={goal === item.value} onChange={() => setGoal(item.value)} />
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                {goal === item.value && <Check aria-hidden="true" size={16} />}
              </label>)}
            </div>
          </fieldset>

          <fieldset className="onboarding-section">
            <legend><Compass aria-hidden="true" size={18} /> Bạn đang ở đâu?</legend>
            <div className="onboarding-options">
              {learnerLevels.map((item) => <label className={`onboarding-option${level === item.value ? " is-selected" : ""}`} key={item.value}>
                <input type="radio" name="level" value={item.value} checked={level === item.value} onChange={() => setLevel(item.value)} />
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                {level === item.value && <Check aria-hidden="true" size={16} />}
              </label>)}
            </div>
          </fieldset>

          <fieldset className="onboarding-section">
            <legend><Clock3 aria-hidden="true" size={18} /> Bạn có bao nhiêu thời gian?</legend>
            <div className="onboarding-options onboarding-options-inline">
              {practiceTimes.map((item) => <label className={`onboarding-option${practiceTime === item.value ? " is-selected" : ""}`} key={item.value}>
                <input type="radio" name="practice-time" value={item.value} checked={practiceTime === item.value} onChange={() => setPracticeTime(item.value)} />
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                {practiceTime === item.value && <Check aria-hidden="true" size={16} />}
              </label>)}
            </div>
          </fieldset>

          {error && <p className="onboarding-error" role="alert">{error}</p>}
          <button className="guest-cta onboarding-submit" type="submit" disabled={busy}>
            {busy ? "Đang chuẩn bị bài học..." : "Bắt đầu bài học đầu tiên"} <ArrowRight aria-hidden="true" size={16} />
          </button>
        </form>

        <aside className="onboarding-summary" aria-labelledby="onboarding-summary-title">
          <p className="guest-section-label guest-section-label-left">LỘ TRÌNH GỢI Ý</p>
          <h2 id="onboarding-summary-title">{selectedLevel?.label}</h2>
          <dl>
            <div><dt>Mục tiêu</dt><dd>{selectedGoal?.label}</dd></div>
            <div><dt>Mỗi ngày</dt><dd>{selectedTime?.label}</dd></div>
            <div><dt>Bài đầu tiên</dt><dd>{recommendation?.tieu_de ?? "Khóa học đang mở"}</dd></div>
          </dl>
          <p className="onboarding-note">Gợi ý dựa trên dữ liệu khóa học đang mở. Đây chưa phải đánh giá trình độ chính thức.</p>
        </aside>
      </div>
    </main>
  </div>;
}
