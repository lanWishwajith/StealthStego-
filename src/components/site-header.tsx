"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/encode", label: "Encode" },
  { href: "/decode", label: "Decode" },
  { href: "/analysis", label: "Steganalysis" },
  { href: "/research", label: "How It Works" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            StealthStego
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
