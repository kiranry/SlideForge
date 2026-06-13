"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Eye, Download, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ListCardsSkeleton } from "@/components/loading-states";
import { listDecks, deleteDeck } from "@/lib/storage";
import type { StoredDeck } from "@/lib/types";

export default function HistoryPage() {
  const [decks, setDecks] = useState<StoredDeck[] | null>(null);

  useEffect(() => {
    setDecks(listDecks());
  }, []);

  const handleDelete = async (deckId: string) => {
    await deleteDeck(deckId);
    setDecks(listDecks());
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            History
          </h1>
          <p className="mt-2 text-muted-foreground">
            Previously generated decks, saved in this browser.
          </p>
        </header>

        {decks === null ? (
          <ListCardsSkeleton count={4} />
        ) : decks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-muted-foreground">No decks yet.</p>
            <Button asChild className="mt-4">
              <Link href="/create">Create your first deck</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {deck.manifest.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(deck.createdAt).toLocaleString()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {deck.manifest.slides.length} slides
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {deck.mode}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/preview/${deck.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/export/${deck.id}`}>
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(deck.id)}
                        aria-label="Delete deck"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
