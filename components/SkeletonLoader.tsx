"use client";

// Skeleton for Last.fm verification status
export function LastFmVerificationSkeleton() {
  return (
    <div className="mb-4 p-3 rounded bg-gray-700/50 border border-gray-600 animate-pulse">
      <div className="h-4 bg-gray-600 rounded w-40"></div>
    </div>
  );
}

// Skeleton for album art
export function AlbumArtSkeleton() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xs aspect-square bg-gray-700 rounded-lg border-2 border-gray-600 animate-pulse"></div>
    </div>
  );
}

// Skeleton for album info text
export function AlbumInfoSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-6 bg-gray-700 rounded w-3/4 animate-pulse"></div>
      <div className="h-5 bg-gray-700 rounded w-full animate-pulse"></div>
      <div className="h-3 bg-gray-700 rounded w-2/3 animate-pulse"></div>
    </div>
  );
}

// Skeleton for tracklist side
export function TracklistSideSkeleton() {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-gray-600 rounded mt-0.5"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-600 rounded w-24"></div>
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2">
                <div className="h-3 bg-gray-600 rounded w-8"></div>
                <div className="h-3 bg-gray-600 rounded flex-1"></div>
                <div className="h-3 bg-gray-600 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for tracklist section
export function TracklistSkeleton() {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <TracklistSideSkeleton />
        <TracklistSideSkeleton />
      </div>
    </div>
  );
}

// Skeleton for album card in library grid
export function AlbumCardSkeleton() {
  return (
    <div className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-600"></div>
      <div className="p-2 space-y-2">
        <div className="h-4 bg-gray-600 rounded w-3/4"></div>
        <div className="h-3 bg-gray-600 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// Skeleton for library grid
export function LibraryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AlbumCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton for database stats
export function DatabaseStatsSkeleton() {
  return (
    <div className="bg-gray-700 rounded-lg p-4 animate-pulse">
      <div className="h-6 bg-gray-600 rounded w-48 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-600 rounded w-32"></div>
        <div className="h-4 bg-gray-600 rounded w-40"></div>
        <div className="h-4 bg-gray-600 rounded w-36"></div>
      </div>
    </div>
  );
}
