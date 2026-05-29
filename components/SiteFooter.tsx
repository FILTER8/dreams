export function SiteFooter() {
  return (
    <footer className="border-t border-[#222] px-6 py-6 text-[10px] tracking-[0.18em] opacity-75">
      <div className="mx-auto flex w-[min(1180px,calc(100vw-32px))] flex-col gap-3 md:flex-row md:justify-between">
        <p>2026 ON-CHAIN AGENT RATCHET VEX by filter8</p>
        <p>
          <a href="https://x.com/0xfilter8" target="_blank" rel="noreferrer" className="cd-link">
            X : FILTER8 /{" "}
          </a>
          <a href="https://x.com/0xdiid" target="_blank" rel="noreferrer" className="cd-link">
            LLM inference by @0xdiid
          </a>
        </p>
      </div>
    </footer>
  );
}
