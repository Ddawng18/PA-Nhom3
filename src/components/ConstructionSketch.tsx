import "../styles/construction-sketch.css";

export default function ConstructionSketch({ variant }: { variant: "login" | "summary" }) {
  return (
    <div className={`construction-sketch construction-sketch--${variant}`} aria-hidden="true">
      <span className="construction-sketch-sphere" />
      <span className="construction-sketch-axis" />
      <span className="construction-sketch-cube" />
    </div>
  );
}
