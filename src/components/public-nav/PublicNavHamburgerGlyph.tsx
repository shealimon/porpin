/**
 * Littlebird-style hamburger: three equal-length horizontal strokes, even spacing.
 */
export function PublicNavHamburgerGlyph({ darkBg }: { darkBg?: boolean }) {
  const stroke = darkBg ? '#fafaf9' : '#0c0a09'
  return (
    <svg
      width={24}
      height={18}
      viewBox="0 0 24 18"
      fill="none"
      className="pointer-events-none block shrink-0"
      aria-hidden
    >
      <path
        d="M3 4.5h18M3 9h18M3 13.5h18"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}
