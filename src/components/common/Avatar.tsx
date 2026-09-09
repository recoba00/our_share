import { UserCircle } from "@phosphor-icons/react";

type AvatarProps = {
  alt: string;
  src?: string | null;
};

export function Avatar({ alt, src }: AvatarProps) {
  if (src) {
    return (
      <img
        alt={alt}
        className="size-12 rounded-2xl border border-[var(--color-border)] object-cover"
        src={src}
      />
    );
  }

  return (
    <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
      <UserCircle size={28} weight="fill" />
    </div>
  );
}
