import { SiteHeader } from "@/components/site-header";
import { ExportPanel } from "@/components/export-panel";

export default function ExportPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">
          Export
        </h1>
        <ExportPanel id={params.id} />
      </main>
    </div>
  );
}
