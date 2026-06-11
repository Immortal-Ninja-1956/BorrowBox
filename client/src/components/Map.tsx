// Map component - uses VITE_GOOGLE_MAPS_API_KEY if provided, otherwise shows a placeholder
interface MapProps {
  lat?: number;
  lng?: number;
  zoom?: number;
  className?: string;
}

export default function Map({
  lat = 20.5937,
  lng = 78.9629,
  zoom = 5,
  className = "",
}: MapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm ${className}`}
      >
        Map unavailable (set VITE_GOOGLE_MAPS_API_KEY)
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat},${lng}&zoom=${zoom}`;
  return (
    <iframe
      className={`rounded-lg border border-border ${className}`}
      src={src}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
