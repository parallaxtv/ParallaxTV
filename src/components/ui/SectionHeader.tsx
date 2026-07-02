interface SectionHeaderProps {
  title: string;
  className?: string; // Allows you to override margins if needed
}

export function SectionHeader({ title, className = "mt-16 pt-8 mb-6" }: SectionHeaderProps) {
  return (
    <div className={`relative border-t border-white/10 ${className}`}>
      {/* ── Top Glowing Gradient Line ── */}
      <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-[var(--color-accent)] to-transparent" />
      
      {/* ── Big Typography & Neon Pill ── */}
      <h2 className="text-2xl font-black text-white/90 flex items-center gap-3">
        <span className="w-1.5 h-6 bg-[var(--color-accent)] inline-block rounded-full shadow-[0_0_12px_var(--color-accent-glow)]" />
        {title}
      </h2>
    </div>
  );
}