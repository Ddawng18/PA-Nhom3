import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export default function FormField({ id, label, required = false, hint, error, className = "", children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return <div className={`form-field ui-field ${className}`.trim()}>
    <label htmlFor={id}>{label}{required ? " *" : ""}</label>
    {children}
    {error ? <p className="field-error" id={errorId} role="alert">{error}</p>
      : hint ? <p className="field-hint" id={hintId}>{hint}</p> : null}
  </div>;
}
