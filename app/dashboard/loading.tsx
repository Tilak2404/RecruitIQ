export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <section className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-7 sm:px-8">
        <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-10 w-72 animate-pulse rounded-full bg-white/8" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/6" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-white/10 bg-[#111315] px-5 py-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/8" />
            <div className="mt-4 h-9 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-36 animate-pulse rounded-full bg-white/6" />
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-6 sm:px-8">
        <div className="h-5 w-28 animate-pulse rounded-full bg-white/8" />
        <div className="mt-4 h-8 w-64 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-white/6" />
        <div className="mt-6 h-12 w-56 animate-pulse rounded-2xl bg-white/10" />
      </section>
    </div>
  );
}
