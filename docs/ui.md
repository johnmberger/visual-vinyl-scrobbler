# UI building blocks

Shared pieces in [`components/ui/`](../components/ui/) for reuse across screens:

- `Modal.tsx` — backdrop, scroll lock, Escape/Enter
- `AlbumCoverImage.tsx` — cover → thumb → placeholder
- `StatusBanner.tsx` — error / success / info panels
- `buttonClasses.ts` — shared button Tailwind variants

Domain screens (`CameraView`, `LibraryView`, …) should import from there instead of re-copying modal/button/cover markup.
