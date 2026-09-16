import type { PolicyDocumentId } from "../../features/compliance/policyDocuments";
import { policyDocuments } from "../../features/compliance/policyDocuments";

export function PolicyDocumentView({ documentId }: { documentId: PolicyDocumentId }) {
  const document = policyDocuments[documentId];

  return (
    <div className="grid gap-5">
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{document.description}</p>
      {document.sections.map((section) => (
        <section className="grid gap-2" key={section.title}>
          <h3 className="text-base font-semibold">{section.title}</h3>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{section.body}</p>
        </section>
      ))}
    </div>
  );
}
