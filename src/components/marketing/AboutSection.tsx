import type { LocalizedContentRow } from '@/lib/marketing/get-partner-page-data';

interface AboutSectionProps {
  content: LocalizedContentRow | null;
}

export default function AboutSection({ content }: AboutSectionProps) {
  if (!content) return null;

  return (
    <section id="about" className="bg-background px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {content.subtitle && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            {content.subtitle}
          </p>
        )}
        {content.title && (
          <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl">
            {content.title}
          </h2>
        )}
        {content.body && (
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {content.body}
          </p>
        )}
      </div>
    </section>
  );
}
