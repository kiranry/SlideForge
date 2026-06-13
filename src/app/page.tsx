import Link from "next/link";
import { ArrowRight, FileText, Table2, Combine } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const MODES = [
  {
    icon: FileText,
    title: "Describe it",
    body: "Write what you need. Claude drafts titles, content, and speaker notes.",
  },
  {
    icon: Table2,
    title: "Drop data",
    body: "Upload Excel or CSV. We detect types and pick the right charts.",
  },
  {
    icon: Combine,
    title: "Combine both",
    body: "Weave a narrative around your numbers — text and charts, interleaved.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="w-full px-4 pb-24 pt-20 sm:px-6 lg:px-8 md:pt-28">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            PowerPoint is the deliverable
          </p>

          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
            Forge investor-ready decks in{" "}
            <span className="text-primary">sixty seconds</span>.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            SlideForge turns a description, a spreadsheet, or both into a
            polished, editable <span className="font-mono text-foreground">.pptx</span>{" "}
            — native charts, speaker notes, and a design system that does not
            look AI-generated.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link href="/create">
                Start building <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/templates">Browse templates</Link>
            </Button>
          </div>

          <div className="mt-20 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {MODES.map((mode, i) => (
              <div
                key={mode.title}
                className="flex flex-col gap-3 bg-card p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <mode.icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold">
                  {mode.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {mode.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="flex w-full flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8 md:flex-row">
          <span className="font-display text-base font-semibold text-foreground">
            SlideForge
          </span>
          <span className="font-mono text-xs">v1.0 — built with Love for AI</span>
        </div>
      </footer>
    </div>
  );
}
