import type { ReactNode } from "react";

export default function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="ui-empty" role="status">
    <h2>{title}</h2>
    <p>{description}</p>
    {action && <div className="ui-empty-action">{action}</div>}
  </section>;
}
