export default function Avatar({ src, name, size = 64, className = "" }: { src?: string | null; name: string; size?: number; className?: string }) {
  const initials = name
    .replace(/^دکتر\s+/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("‌");
  const style = { width: size, height: size };
  if (src) return <img src={src} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
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
