"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { WikiPageSummary } from "@/types/wiki";
import { wikiTypeIcon, wikiTypeColor, wikiTypeGroupLabel } from "./wiki-type-badge";

const GROUP_ORDER = ["entity", "concept", "topic", "source"];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function WikiPageTree({
  activeSlug,
}: {
  activeSlug?: string;
}) {
  const pathname = usePathname();
  const [pages, setPages] = React.useState<WikiPageSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(GROUP_ORDER)
  );
  const debouncedSearch = useDebounce(search, 150);

  React.useEffect(() => {
    api<WikiPageSummary[]>("/api/wiki/pages?limit=200")
      .then((data) => setPages(Array.isArray(data) ? data : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    if (!debouncedSearch) return pages;
    const q = debouncedSearch.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q)
    );
  }, [pages, debouncedSearch]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, WikiPageSummary[]>();
    for (const p of filtered) {
      const t = p.page_type;
      if (t === "index" || t === "log") continue;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(p);
    }
    return map;
  }, [filtered]);

  const toggleGroup = (type: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

  const currentSlug = activeSlug ?? pathname.replace(/^\/wiki\//, "");

  if (collapsed) {
    return (
      <div className="w-10 border-r border-border bg-card/30 flex flex-col items-center pt-4 gap-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Expand page tree"
        >
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          Pages
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse"
        >
          <span className="material-symbols-outlined text-base">chevron_left</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
          <span className="material-symbols-outlined text-sm text-muted-foreground">
            search
          </span>
          <input
            type="text"
            placeholder="Filter pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-3 space-y-2 mt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-7 rounded-md bg-muted animate-pulse"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </div>
        ) : grouped.size === 0 ? (
          <p className="text-xs text-muted-foreground px-4 py-3">No pages found.</p>
        ) : (
          GROUP_ORDER.filter((t) => grouped.has(t)).map((type) => {
            const items = grouped.get(type)!;
            const isExpanded = expandedGroups.has(type);
            return (
              <div key={type} className="mb-1">
                <button
                  onClick={() => toggleGroup(type)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs text-muted-foreground">
                    {isExpanded ? "expand_more" : "chevron_right"}
                  </span>
                  <span
                    className="material-symbols-outlined text-xs"
                    style={{ color: wikiTypeColor(type), fontSize: 13 }}
                  >
                    {wikiTypeIcon(type)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1 text-left">
                    {wikiTypeGroupLabel(type)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </button>
                {isExpanded && (
                  <div className="ml-3">
                    {items.map((page) => {
                      const isActive = page.slug === currentSlug;
                      return (
                        <Link
                          key={page.slug}
                          href={`/wiki/${page.slug}`}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg mx-1 text-xs transition-all",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          )}
                          title={page.summary || page.title}
                        >
                          <span className="truncate">{page.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: link to graph */}
      {/* <div className="border-t border-border p-3">
        <Link
          href="/wiki/graph"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-sm">hub</span>
          Graph View
        </Link>
      </div> */}
    </div>
  );
}
