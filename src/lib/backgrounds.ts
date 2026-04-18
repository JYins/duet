// preset backgrounds for the photo strip
//
// using high-quality unsplash images (CC0, free for commercial use).
// these are loaded via URL — no local assets needed.

export interface Background {
  id: string;
  label: string;
  url: string | null; // null = solid cream (default)
  credit?: string;
}

export const BACKGROUNDS: Background[] = [
  {
    id: "cream",
    label: "studio",
    url: null,
  },
  {
    id: "cafe",
    label: "cafe",
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&auto=format",
    credit: "unsplash",
  },
  {
    id: "cherry",
    label: "sakura",
    url: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80&auto=format",
    credit: "unsplash",
  },
  {
    id: "neon",
    label: "neon",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format",
    credit: "unsplash",
  },
  {
    id: "studio-white",
    label: "white",
    url: "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=800&q=80&auto=format",
    credit: "unsplash",
  },
  {
    id: "sunset",
    label: "golden",
    url: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80&auto=format",
    credit: "unsplash",
  },
];
