// pages/admin/components/AlbumsTable.tsx
import { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { useMusicStore } from "@/stores/useMusicStore";
import { Calendar, Music, Trash2, Pencil, Loader, Disc3 } from "lucide-react";
import EditAlbumDialog from "@/components/EditAlbumDialog";
import AlbumThumbnail from "@/components/AlbumThumbnail";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// Skeleton row component
const AlbumRowSkeleton = memo(({ isMobile }: { isMobile: boolean }) => {
  if (isMobile) {
    return (
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-14 h-14 rounded-lg bg-white/[0.08] animate-shimmer shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="h-4 w-[60%] max-w-[180px] rounded bg-white/[0.08] animate-shimmer" />
          <div className="h-3 w-[40%] max-w-[120px] rounded bg-white/[0.06] animate-shimmer" />
          <div className="h-2.5 w-[30%] max-w-[80px] rounded bg-white/[0.05] animate-shimmer" />
        </div>
        <div className="flex gap-1">
          <div className="size-8 rounded-lg bg-white/[0.04]" />
          <div className="size-8 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="w-12 h-12 rounded-lg bg-white/[0.08] animate-shimmer shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-[50%] max-w-[200px] rounded bg-white/[0.08] animate-shimmer" />
      </div>
      <div className="w-[120px] hidden sm:block">
        <div className="h-3.5 w-[70%] rounded bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="w-[80px] hidden md:block">
        <div className="h-3.5 w-[60%] rounded bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="w-[80px] hidden lg:block">
        <div className="h-3.5 w-[50%] rounded bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="w-[80px] flex gap-1 justify-end">
        <div className="size-8 rounded-lg bg-white/[0.04]" />
        <div className="size-8 rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  );
});

AlbumRowSkeleton.displayName = "AlbumRowSkeleton";

// Individual album row with loading state
const AlbumRow = memo(({
  album,
  isMobile,
  onEdit,
  onDelete,
}: {
  album: any;
  isMobile: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (mounted) setIsReady(true);
    }, 30);

    // Preload image
    if (album.imageUrl) {
      const img = new Image();
      img.src = album.imageUrl;
      img.onload = () => {
        if (mounted) setImageLoaded(true);
      };
      img.onerror = () => {
        if (mounted) setImageLoaded(true);
      };
    } else {
      // No image URL, use mosaic
      setImageLoaded(true);
    }

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [album.imageUrl, album._id]);

  const showContent = isReady && imageLoaded;

  if (!showContent) {
    return <AlbumRowSkeleton isMobile={isMobile} />;
  }

  // Mobile version
  if (isMobile) {
    return (
      <div className="group flex items-center gap-3 px-3 py-3 animate-in fade-in-0 duration-150">
        {/* Album Cover */}
        <Link to={`/albums/${album._id}`} className="shrink-0">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-800 shadow-md">
            {album.imageUrl ? (
              <img
                src={album.imageUrl}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <AlbumThumbnail
                imageUrl={album.imageUrl}
                previewImages={album.previewImages}
                title={album.title}
                useMosaicCover={album.useMosaicCover}
                className="w-full h-full"
              />
            )}
          </div>
        </Link>

        {/* Album Info */}
        <Link to={`/albums/${album._id}`} className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate text-sm">
            {album.title}
          </h3>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {album.artist}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
            <span>{album.releaseYear}</span>
            <span>•</span>
            <span>{album.songs?.length ?? 0} songs</span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="h-9 w-9 text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="group flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors animate-in fade-in-0 duration-150">
      {/* Album Cover */}
      <Link to={`/albums/${album._id}`} className="shrink-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shadow-sm group-hover:shadow-md transition-shadow">
          {album.imageUrl ? (
            <img
              src={album.imageUrl}
              alt={album.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <AlbumThumbnail
              imageUrl={album.imageUrl}
              previewImages={album.previewImages}
              title={album.title}
              useMosaicCover={album.useMosaicCover}
              className="w-full h-full"
            />
          )}
        </div>
      </Link>

      {/* Title */}
      <Link to={`/albums/${album._id}`} className="flex-1 min-w-0">
        <span className="font-medium text-white truncate block hover:underline">
          {album.title}
        </span>
      </Link>

      {/* Artist */}
      <div className="w-[120px] hidden sm:block">
        <span className="text-zinc-400 text-sm truncate block">
          {album.artist}
        </span>
      </div>

      {/* Release Year */}
      <div className="w-[80px] hidden md:flex items-center gap-1.5 text-zinc-500 text-sm">
        <Calendar className="h-3.5 w-3.5" />
        <span>{album.releaseYear}</span>
      </div>

      {/* Songs Count */}
      <div className="w-[80px] hidden lg:flex items-center gap-1.5 text-zinc-500 text-sm">
        <Music className="h-3.5 w-3.5" />
        <span>{album.songs?.length ?? 0}</span>
      </div>

      {/* Actions */}
      <div className="w-[80px] flex items-center gap-1 justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

AlbumRow.displayName = "AlbumRow";

const AlbumsTable = () => {
  const { albums, deleteAlbum, fetchAlbums, isLoading } = useMusicStore();
  const [editingAlbum, setEditingAlbum] = useState<any>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const parentRef = useRef<HTMLDivElement>(null);

  const rowHeight = isMobile ? 80 : 64;

  const rowVirtualizer = useVirtualizer({
    count: albums.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 6,
  });

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  if (isLoading && albums.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
          <Disc3 className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-zinc-300 mb-1">No albums yet</h3>
        <p className="text-sm text-zinc-500">Create your first album to get started</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={parentRef}
        className={cn(
          "overflow-auto scrollbar-thin",
          isMobile ? "max-h-[calc(100vh-280px)]" : "max-h-[65vh]"
        )}
      >
        {/* Header - Desktop only */}
        {!isMobile && (
          <div className="flex items-center gap-4 px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800/80 sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
            <div className="w-12"></div>
            <div className="flex-1">Title</div>
            <div className="w-[120px] hidden sm:block">Artist</div>
            <div className="w-[80px] hidden md:block">Year</div>
            <div className="w-[80px] hidden lg:block">Songs</div>
            <div className="w-[80px] text-right">Actions</div>
          </div>
        )}

        {/* Virtualized list */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const album = albums[virtualRow.index];

            return (
              <div
                key={album._id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <AlbumRow
                  album={album}
                  isMobile={isMobile}
                  onEdit={() => setEditingAlbum(album)}
                  onDelete={() => deleteAlbum(album._id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Album Dialog */}
      {editingAlbum && (
        <EditAlbumDialog
          isOpen={!!editingAlbum}
          onClose={() => setEditingAlbum(null)}
          album={editingAlbum}
        />
      )}
    </>
  );
};

export default AlbumsTable;