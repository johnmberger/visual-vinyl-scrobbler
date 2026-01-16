"use client";

interface Track {
  position: string;
  title: string;
  duration?: string;
}

interface Side {
  side: string;
  tracks: Track[];
  label: string;
}

interface TracklistSideSelectorProps {
  sides: Side[];
  selectedSides: Set<string>;
  onSelectionChange: (selectedSides: Set<string>) => void;
  releaseId?: number;
}

export default function TracklistSideSelector({
  sides,
  selectedSides,
  onSelectionChange,
  releaseId,
}: TracklistSideSelectorProps) {
  const handleSideToggle = (side: string, checked: boolean) => {
    const newSelected = new Set(selectedSides);
    if (checked) {
      newSelected.add(side);
    } else {
      newSelected.delete(side);
    }
    onSelectionChange(newSelected);
  };

  if (sides.length === 0) {
    return (
      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
        <p className="text-gray-400 text-sm">
          Tracklist not available. Will scrobble album as a single track.
        </p>
        {releaseId && (
          <p className="text-gray-500 text-xs mt-1">Release ID: {releaseId}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="text-gray-300 text-sm font-semibold mb-3">
        Select Sides to Scrobble:
      </p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {sides.map((side) => (
          <div
            key={side.side}
            className={`bg-gray-700/50 rounded-lg p-3 border ${
              selectedSides.has(side.side)
                ? "border-blue-500"
                : "border-gray-600"
            }`}
          >
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSides.has(side.side)}
                onChange={(e) => handleSideToggle(side.side, e.target.checked)}
                className="w-5 h-5 mt-0.5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
              />
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-white font-semibold text-sm">
                    {side.label}
                  </p>
                  <span className="text-gray-400 text-xs">
                    ({side.tracks.length} track
                    {side.tracks.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="space-y-0.5">
                  {side.tracks.map((track, idx) => (
                    <div
                      key={idx}
                      className="flex items-start text-xs text-gray-300"
                    >
                      <span className="text-gray-500 mr-2 min-w-[2rem] flex-shrink-0">
                        {track.position}
                      </span>
                      <span className="flex-1 truncate">{track.title}</span>
                      {track.duration && (
                        <span className="text-gray-500 ml-2 flex-shrink-0">
                          {track.duration}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>
      {selectedSides.size === 0 && (
        <p className="text-yellow-400 text-xs mt-2">
          ⚠ No sides selected. Please select at least one side to scrobble.
        </p>
      )}
    </>
  );
}
