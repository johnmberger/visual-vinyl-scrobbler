"use client";

import { useState } from "react";

interface TimestampPickerProps {
  initialTimestamp?: number;
  onTimestampChange: (timestamp: number) => void;
  label?: string;
}

export default function TimestampPicker({
  initialTimestamp,
  onTimestampChange,
  label = "Scrobble Time",
}: TimestampPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [dateTime, setDateTime] = useState(() => {
    const date = initialTimestamp
      ? new Date(initialTimestamp * 1000)
      : new Date();
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateTime = e.target.value;
    setDateTime(newDateTime);

    if (newDateTime) {
      const date = new Date(newDateTime);
      const timestamp = Math.floor(date.getTime() / 1000);
      onTimestampChange(timestamp);
    }
  };

  const setToNow = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const newDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setDateTime(newDateTime);
    onTimestampChange(Math.floor(now.getTime() / 1000));
  };

  const adjustTime = (minutes: number) => {
    const currentDate = new Date(dateTime);
    currentDate.setMinutes(currentDate.getMinutes() + minutes);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const mins = String(currentDate.getMinutes()).padStart(2, "0");
    const newDateTime = `${year}-${month}-${day}T${hours}:${mins}`;
    setDateTime(newDateTime);
    onTimestampChange(Math.floor(currentDate.getTime() / 1000));
  };

  const currentTimestamp = new Date(dateTime).getTime() / 1000;
  const date = new Date(currentTimestamp * 1000);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-300 block">{label}</label>

      {showPicker ? (
        <div className="space-y-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
          {/* Date/Time Input */}
          <div>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={handleDateTimeChange}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={setToNow}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => adjustTime(-60)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                -1h
              </button>
              <button
                type="button"
                onClick={() => adjustTime(-30)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                -30m
              </button>
              <button
                type="button"
                onClick={() => adjustTime(-15)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                -15m
              </button>
              <button
                type="button"
                onClick={() => adjustTime(15)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => adjustTime(30)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                +30m
              </button>
              <button
                type="button"
                onClick={() => adjustTime(60)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                +1h
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-xs text-gray-400 hover:text-gray-300 self-start transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
          <div className="flex items-center gap-3">
            <div className="text-white">
              <div className="text-sm font-medium">{formattedTime}</div>
              <div className="text-xs text-gray-400">{formattedDate}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Adjust
          </button>
        </div>
      )}
    </div>
  );
}
