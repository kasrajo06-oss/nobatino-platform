import { DoctorFemale, DoctorMale } from "healthicons-react/filled";

/**
 * Photo when available; otherwise an illustrated doctor (by gender) or initials for centers/people.
 */
export default function Avatar({
  src,
  name,
  size = 64,
  className = "",
  gender,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  gender?: "male" | "female" | "";
}) {
  const style = { width: size, height: size };
  if (src) return <img src={src} alt={name} style={style} className={`shrink-0 rounded-full object-cover ring-4 ring-white ${className}`} />;
  if (gender) {
    const Icon = gender === "female" ? DoctorFemale : DoctorMale;
    return (
      <div
        style={style}
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full ring-4 ring-white ${
          gender === "female" ? "bg-gradient-to-br from-rose-50 to-pink-100 text-rose-400" : "bg-gradient-to-br from-brand-50 to-brand-100 text-brand-500"
        } ${className}`}
        aria-label={name}
        role="img"
      >
        <Icon style={{ width: size * 0.78, height: size * 0.78, marginTop: size * 0.18 }} />
      </div>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter((w) => !["دکتر", "آزمایشگاه", "بیمارستان", "کلینیک", "درمانگاه", "داروخانه", "مرکز"].includes(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("‌");
  return (
    <div
      style={{ ...style, fontSize: size / 2.8 }}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-bold text-brand-800 ${className}`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
