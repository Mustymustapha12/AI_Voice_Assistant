import { Blocks, Database, ShieldCheck, Waypoints } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const foundations = [
  {
    description: 'Strict TypeScript, enforced boundaries, and independently testable packages.',
    icon: Blocks,
    title: 'Modular architecture',
  },
  {
    description: 'PostgreSQL, Redis, Prisma, and BullMQ are wired behind platform modules.',
    icon: Database,
    title: 'Infrastructure ready',
  },
  {
    description: 'Validated configuration, redacted logs, safe errors, and hardened HTTP defaults.',
    icon: ShieldCheck,
    title: 'Secure by default',
  },
  {
    description: 'API and worker shells can evolve independently without leaking domain concerns.',
    icon: Waypoints,
    title: 'Scale-ready topology',
  },
] as const;

export default function HomePage(): React.JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--color-glow),transparent_40%)]" />
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-8 lg:px-8">
        <header className="border-border/60 flex items-center justify-between border-b pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-sm font-bold">
              AV
            </div>
            <div>
              <p className="font-semibold">AI Voice Commerce</p>
              <p className="text-muted-foreground text-xs">Platform administration</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="flex flex-1 flex-col justify-center py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-primary mb-4 text-sm font-medium uppercase tracking-wide">
              Phase 1 foundation
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Enterprise infrastructure before business features.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-pretty text-lg leading-8">
              The control plane is ready for bounded contexts to be added deliberately. No
              authentication, commerce, AI, telephony, or payment behavior exists yet.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {foundations.map((foundation) => (
              <Card className="bg-card/75 backdrop-blur" key={foundation.title}>
                <CardHeader>
                  <foundation.icon aria-hidden="true" className="text-primary mb-4 size-5" />
                  <CardTitle>{foundation.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-6">{foundation.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
