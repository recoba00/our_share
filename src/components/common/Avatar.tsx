import { UserCircle } from "@phosphor-icons/react";

type AvatarProps = {
  alt: string;
  className?: string;
  src?: string | null;
};

export function Avatar({ alt, className = "", src }: AvatarProps) {
  if (src) {
    return (
      <img
        alt={alt}
        className={`size-12 rounded-full object-cover ring-1 ring-inset ring-black/[0.04] ${className}`}
        src={src}
      />
    );
  }

  return (
    <div className={`grid size-12 place-items-center rounded-full bg-brand-soft text-brand ring-1 ring-inset ring-black/[0.04] ${className}`}>
      <UserCircle size={28} weight="fill" />
    </div>
  );
}
