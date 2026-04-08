export function LimitedDataBanner({
  title = "Limited Data Mode",
  description = "This page loaded with fallback data because the workspace database is responding slowly. You can keep navigating and retry the page after the connection settles."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[24px] border border-yellow-400/20 bg-yellow-400/10 px-4 py-4 text-sm leading-7 text-yellow-100">
      <p className="font-semibold text-yellow-50">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
