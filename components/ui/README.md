/**
 * Shared UI building blocks for junior-friendly reuse.
 *
 * - Modal.tsx          — backdrop, scroll lock, Escape/Enter
 * - AlbumCoverImage.tsx — cover → thumb → placeholder
 * - StatusBanner.tsx   — error / success / info panels
 * - buttonClasses.ts   — shared button Tailwind variants
 *
 * Domain screens (CameraView, LibraryView, …) should import from here
 * instead of re-copying modal/button/cover markup.
 */
