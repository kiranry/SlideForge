import Link from "next/link";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/brand-kits", label: "Brand kits" },
  { href: "/history", label: "History" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            SlideForge
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          <Button size="sm" asChild className="ml-2">
            <Link href="/create">Start building</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
