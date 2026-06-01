"use client";

import { healthCheck } from "@/lib/api";
import { HealthCheckResponse } from "@/types/types";
import { useEffect, useState } from "react";

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(
    null,
  );

  useEffect(() => {
    async function fetchHealthData() {
      try {
        const data = await healthCheck();

        setHealthData(data);
      } catch (error: any) {
        console.error("Error fetching health data:", error);

        setHealthData({
          status: error.message || "Error fetching health data",
        });
      }
    }

    fetchHealthData();
  }, []);

  return healthData === null ? (
    <div className="h-full flex items-center justify-center">
      <p className="text-gray-500">Checking health status...</p>
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Health Check</h1>
      {healthData.status === "healthy" ? (
        <p className="text-green-500">The application is healthy.</p>
      ) : (
        <p className="text-red-500">
          The application is not healthy.
          <pre>{healthData.status}</pre>
        </p>
      )}
    </div>
  );
}
