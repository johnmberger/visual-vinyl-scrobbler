"use client";

import { useState, useEffect } from "react";

export default function ConfigStatus() {
  const [configStatus, setConfigStatus] = useState<{
    valid: boolean;
    errors?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      const response = await fetch("/api/config/validate");
      const data = await response.json();
      setConfigStatus(data);
    } catch (err) {
      console.error("Error checking config:", err);
      setConfigStatus({ valid: false, errors: ["Failed to check configuration"] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!configStatus || configStatus.valid) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg">
      <p className="text-yellow-200 font-semibold mb-2">
        ⚠️ Configuration Missing
      </p>
      <p className="text-yellow-300 text-sm mb-2">
        Some required API credentials are not set. Please create a `.env.local` file with your credentials.
      </p>
      {configStatus.errors && configStatus.errors.length > 0 && (
        <ul className="text-yellow-300 text-sm list-disc list-inside">
          {configStatus.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      <p className="text-yellow-300 text-xs mt-2">
        See README.md or SETUP.md for instructions on setting up environment variables.
      </p>
    </div>
  );
}
