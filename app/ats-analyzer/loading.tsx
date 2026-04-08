export default function AtsAnalyzerLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <section className="rounded-[34px] border border-white/10 bg-black/30 px-6 py-8 backdrop-blur-xl sm:px-8">
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 h-10 w-80 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/5" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-white/5" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-56 animate-pulse rounded-full bg-white/5" />
            <div className="mt-6 h-[420px] animate-pulse rounded-[24px] bg-white/[0.04]" />
          </div>
        ))}
      </section>

      <div className="flex justify-center">
        <div className="h-14 w-56 animate-pulse rounded-full bg-primary/15" />
      </div>
    </div>
  );
}
