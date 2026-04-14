import type { LocalizedGlobalContentRow } from '@/lib/marketing/get-partner-page-data';
import type { Json } from '@/types/supabase';
import IconRenderer from '@/components/marketing/IconRenderer';

interface RoleItem {
  role: string;
  title: string;
  description: string;
  metrics: string[];
}

interface Props {
  content: LocalizedGlobalContentRow | null;
}

function parseRoles(meta: Json | null): RoleItem[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const roles = (meta as Record<string, Json>)['roles'];
  if (!Array.isArray(roles)) return [];
  return roles.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const r = item as Record<string, Json>;
    if (typeof r.role !== 'string' || typeof r.title !== 'string' || typeof r.description !== 'string') return [];
    const metrics = Array.isArray(r.metrics)
      ? r.metrics.flatMap((m) => (typeof m === 'string' ? [m] : []))
      : [];
    return [{ role: r.role, title: r.title, description: r.description, metrics }];
  });
}

export default function RoleBasedValue({ content }: Props) {
  const title = content?.title ?? '당신의 역할에 최적화된 대시보드';
  const subtitle = content?.subtitle ?? null;
  const roles = parseRoles(content?.meta ?? null);

  return (
    <section
      id="role-value"
      className="scroll-mt-16 bg-secondary px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-secondary-foreground sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>

        {roles.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-3">
            {roles.map((item) => {
              return (
                <div
                  key={item.role}
                  className="rounded-xl border border-border bg-background p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <IconRenderer name={item.role} className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {item.role}
                    </span>
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  {item.metrics.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {item.metrics.map((metric) => (
                        <li
                          key={metric}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          {metric}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
