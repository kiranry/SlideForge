import { SiteHeader } from "@/components/site-header";
import { BuilderForm } from "@/components/builder-form";
import { DevWarmup } from "@/components/dev-warmup";

export default function CreatePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DevWarmup />
      <SiteHeader />
      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Build a deck
          </h1>
          <p className="mt-2 text-muted-foreground">
            Describe what you need and SlideForge drafts the slides, content, and
            speaker notes — ready to preview and export as PowerPoint.
          </p>
        </header>
        <BuilderForm />
      </main>
    </div>
  );
}
