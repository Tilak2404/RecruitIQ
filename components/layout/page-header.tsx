import { Badge } from "@/components/ui/badge";

export function PageHeader({
  badge,
  title,
  description,
  actions
}: {
  badge: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <Badge className="border-primary/20 bg-primary/10 text-primary">{badge}</Badge>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-white/60 sm:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}
