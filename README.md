# duet

collaborative photo booth for long-distance friends. take photos together, even when you're apart.

users on separate devices each take photos through their browser. on-device portrait segmentation extracts each person, places them onto a shared background, applies unified color grading, and generates a korean-style 4-frame photo strip that looks like everyone was in the same room.

## how it works

1. **on-device portrait segmentation** — MediaPipe Tasks (desktop/Android) with TensorFlow.js WebGL fallback (iOS Safari). no photos leave the device.
2. **shared background compositing** — Canvas 2D composites segmented portraits onto preset scene backgrounds.
3. **unified LUT color grading** — WebGL2 fragment shader applies `.cube` LUT to the entire composite, forcing all subjects into the same color space for visual coherence.
4. **cross-device collaboration** — one user creates a room, the other joins via link/QR. the first user's portrait appears as a ghost overlay so the second user can align their pose before shooting.

## tech stack

| layer | choice | why |
|---|---|---|
| framework | Next.js 15, App Router | fast iteration, Vercel deploy, SSR when needed |
| language | TypeScript (strict) | type safety across browser APIs and WebGL |
| styling | Tailwind CSS 4 + shadcn/ui | token-friendly components, no dependency lock-in |
| animation | Framer Motion | smooth transitions for camera UI and strip reveal |
| segmentation | MediaPipe + TF.js dual-engine | runtime detection routes to fastest backend per device |
| color grading | WebGL2 + .cube LUT | custom fragment shader, real-time preview |
| compositing | Canvas 2D | drawImage + globalCompositeOperation, simple and fast |
| realtime | Supabase (Realtime + Storage) | room state sync, photo transfer, RLS for isolation |
| hosting | Vercel | zero-config HTTPS, edge functions |

## architecture decisions

**web over native** — browser deployment means instant iteration (no TestFlight, no provisioning). MediaPipe and WebGL ecosystems are mature on web. if App Store distribution is needed later, Capacitor wraps 95% of the codebase.

**on-device inference** — zero server GPU cost, photos never leave the user's device (privacy as a feature), and client-side processing enables real-time preview interactions like adjustable depth-of-field.

**dual segmentation runtime** — MediaPipe is fastest on desktop Chrome and Android. TF.js + WebGL backend is faster and more stable on iOS Safari. device detection at startup routes to the right engine automatically.

**shared backgrounds instead of scene fusion** — merging two real environments is an unsolved image harmonization problem. using preset backgrounds reduces it to an engineering problem: paste two cutouts onto one scene.

**post-composite LUT** — applying color grading to the final composite (not individual portraits) forces both subjects into the same color space. this is the single most important step for the "they were actually together" illusion.

## project structure

```
src/
├── app/              # Next.js App Router
│   ├── page.tsx      # landing
│   └── booth/        # camera + capture flow
├── components/       # UI components
├── hooks/            # useCamera, useCountdown
├── lib/              # camera, segmentation, compositing, LUT
└── types/
```

## development

```bash
npm install
npm run dev
```

open `localhost:3000`. camera access requires HTTPS in production (Vercel handles this) but works on localhost for development.

### supabase setup

1. create a project at [supabase.com](https://supabase.com)
2. run `supabase-schema.sql` in the SQL editor
3. copy `.env.example` to `.env.local` and fill in your project URL + anon key
4. for Vercel: add the same env vars in project settings

## status

week 1 — single-device photo booth:

- camera preview with 3:4 crop, flip, 3-second countdown, shutter flash
- dual-engine portrait segmentation (MediaPipe + TF.js iOS fallback)
- canvas 2d compositing into 1×4 korean-style photo strip
- webgl2 lut color grading (4 built-in presets: natural, portra, cool, mono)
- film grain overlay + radial vignette post-processing
- live lut re-grading after capture
- responsive layout with safe-area insets and fluid sizing

week 2 — cross-device collaboration (mode a):

- supabase rooms with short codes + QR sharing
- host creates room, takes photos, cutouts uploaded to storage
- guest joins via link, sees host's cutout as ghost overlay for pose alignment
- duet composite: both people in each frame (host left, guest right)
- host auto-receives the combined strip when guest finishes via realtime
- landing page with start-a-duet / solo booth / join-by-code flows

week 3 — polish and wow:

- depth-of-field slider (0-100): gaussian blur on background, person stays sharp
- 6 preset backgrounds: studio, cafe, sakura, neon, white, golden (unsplash CC0)
- all settings (background, LUT, depth) adjustable after capture without reshooting
- font loading optimized with `display: swap`
- open graph + twitter card metadata
- custom 404 page

## license

MIT
