import { SiteHeader } from "@/components/site-header";
import { DeckPreview } from "@/components/deck-preview";

export default function PreviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen w-full flex-col xl:h-screen xl:overflow-hidden">
      <SiteHeader />
      <main className="w-full flex-1 min-h-0 xl:overflow-hidden">
        <DeckPreview id={params.id} />
      </main>
    </div>
  );
}
