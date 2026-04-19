// preset backgrounds for the photo strip
// solid colors first (no loading), then scene images

export interface Background {
  id: string;
  label: string;
  url: string | null;
  color: string; // solid fill color (used when url is null or loading)
}

export const BACKGROUNDS: Background[] = [
  // solid colors — instant, no network
  { id: "cream", label: "cream", url: null, color: "#EDE9DF" },
  { id: "white", label: "white", url: null, color: "#FFFFFF" },
  { id: "blush", label: "blush", url: null, color: "#F0D9D4" },
  { id: "sage", label: "sage", url: null, color: "#D4DDD4" },
  { id: "sky", label: "sky", url: null, color: "#D4DEE8" },
  { id: "charcoal", label: "dark", url: null, color: "#3A3A38" },
  // scene images — unsplash CC0
  {
    id: "cafe",
    label: "cafe",
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&auto=format",
    color: "#8B7355",
  },
  {
    id: "cherry",
    label: "sakura",
    url: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80&auto=format",
    color: "#E8C4C8",
  },
  {
    id: "neon",
    label: "neon",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format",
    color: "#2A1A3E",
  },
  {
    id: "golden",
    label: "golden",
    url: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80&auto=format",
    color: "#C8A870",
  },
];
