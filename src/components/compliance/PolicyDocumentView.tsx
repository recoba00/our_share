import type { PolicyDocumentId } from "../../features/compliance/policyDocuments";
import {
  POLICY_EFFECTIVE_DATE,
  policyDocuments,
} from "../../features/compliance/policyDocuments";

export function PolicyDocumentView({ documentId }: { documentId: PolicyDocumentId }) {
  const document = policyDocuments[documentId];

  return (
    <div className="policy-scroll-mask">
      <div
        aria-label={`${document.title} 내용`}
        className="policy-scroll-region grid gap-5"
        role="region"
        tabIndex={0}
      >
        <div className="grid gap-1">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{document.description}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">시행일 {POLICY_EFFECTIVE_DATE}</p>
        </div>
        {document.sections.map((section) => (
          <section className="grid gap-2" key={section.title}>
            <h3 className="text-base font-semibold">{section.title}</h3>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
