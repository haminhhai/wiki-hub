"use client";

import React from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { WikiPageDetail } from "@/types/wiki";
import { WikiPageTree } from "@/components/wiki/wiki-page-tree";
import { WikiContent } from "@/components/wiki/wiki-content";
import { WikiBacklinks } from "@/components/wiki/wiki-backlinks";
import { WikiTypeBadge } from "@/components/wiki/wiki-type-badge";
import { WikiSearchDialog } from "@/components/wiki/wiki-search-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WikiPageViewer() {
  const params = useParams();
  const slugParts = Array.isArray(params.slug) ? params.slug : [params.slug ?? ""];
  const fullSlug = slugParts.join("/");

  const [page, setPage] = React.useState<WikiPageDetail | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    if (!fullSlug) return;
    setLoading(true);
    setNotFound(false);
    setPage(null);

    api<WikiPageDetail>(`/api/wiki/pages/${encodeURIComponent(fullSlug)}`)
      .then((data) => setPage(data))
      .catch((err) => {
        if (err?.status === 404 || err?.message?.includes("404")) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [fullSlug]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <PageHeader
        title="Knowledge Wiki"
        description="Compiled knowledge from your organization's documents."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="gap-2"
            >
              <span className="material-symbols-outlined text-base">search</span>
              Search
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded border border-border text-xs font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Link
              href="/wiki/graph"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>hub</span>
              Graph View
            </Link>
          </div>
        }
      />

      <div
        className="flex-1 flex gap-0 -mx-6 md:-mx-8 lg:-mx-10 -mb-6 md:-mb-8 lg:-mb-10 min-h-0 border-t border-border overflow-hidden"
      >
        {/* Left: Page Tree */}
        <WikiPageTree activeSlug={fullSlug} />

        {/* Center: Content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 mt-8">
              <span className="material-symbols-outlined text-3xl text-muted-foreground animate-spin">
                progress_activity
              </span>
            </div>
          ) : notFound ? (
            <div className="px-8 py-12">
              <EmptyState
                icon="find_in_page"
                title="Page not found"
                description={`No wiki page found for "${fullSlug}". It may not have been compiled yet.`}
              />
            </div>
          ) : page ? (
            <div className="max-w-3xl mx-auto px-8 py-8">
              {/* Page header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <WikiTypeBadge type={page.page_type} />
                  <span className="text-xs text-muted-foreground">
                    v{page.version} · Updated{" "}
                    {new Date(page.updated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h1 className="font-heading text-4xl font-normal leading-tight text-foreground">
                  {page.title}
                </h1>
                {page.summary && (
                  <p className="mt-2 text-muted-foreground text-sm leading-6">{page.summary}</p>
                )}
              </div>

              {/* Markdown body */}
              <WikiContent markdown={page.content_md} />
            </div>
          ) : null}
        </div>

        {/* Right: Backlinks (hidden on < lg) */}
        {page && (
          <div className="hidden lg:block">
            <WikiBacklinks
              slug={fullSlug}
              backlinks={page.backlinks}
              outlinks={page.outlinks}
              sourceIds={page.source_ids}
            />
          </div>
        )}
      </div>

      <WikiSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
