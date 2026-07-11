export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" aria-label="Pathfinder logo"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      data-testid="logo"
    >
      <circle cx="16" cy="16" r="10" />
      <path d="M11 21 L15 13 L21 11 L17 19 Z" fill="hsl(var(--accent))" stroke="none" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
