export default function MapEmbed({ lat, lng, title }: { lat: string | number | null; lng: string | number | null; title: string }) {
  if (lat === null || lng === null) return null;
  const la = Number(lat);
  const ln = Number(lng);
  const d = 0.01;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${ln - d}%2C${la - d}%2C${ln + d}%2C${la + d}&layer=mapnik&marker=${la}%2C${ln}`;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <iframe title={`نقشه ${title}`} src={src} className="h-56 w-full" loading="lazy" />
      <a className="block bg-slate-50 px-3 py-2 text-xs text-brand-700" href={`https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=16/${la}/${ln}`} target="_blank" rel="noreferrer">
        مسیریابی روی نقشه
      </a>
    </div>
  );
}
