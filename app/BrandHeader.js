export default function BrandHeader({ children = null }) {
  return (
    <header className="border-b border-zinc-300 bg-white">
      <div className="flex w-full items-center justify-between gap-6 px-8 py-3">
        <img
          src="/brand/clte-banner.png"
          alt="CLTE — Commodity Logistics & Trade Execution Platform"
          className="h-12 w-auto max-w-[min(100%,40rem)] object-contain object-left"
        />
        {children ? (
          <div className="flex shrink-0 items-center gap-3">{children}</div>
        ) : null}
      </div>
      <div className="h-0.5 bg-gold-600" aria-hidden="true" />
    </header>
  );
}
