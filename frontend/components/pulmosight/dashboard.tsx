"use client";

import { useState, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/pulmosight/sidebar";
import { Header } from "@/components/pulmosight/header";
import { LungVisualization } from "@/components/pulmosight/lung-visualization";
import { DiseaseScore } from "@/components/pulmosight/disease-score";
import { LungVolume } from "@/components/pulmosight/lung-volume";
import { FVCPrediction } from "@/components/pulmosight/fvc-prediction";
import { DicomModal } from "@/components/pulmosight/dicom-modal";

// mocking patient list
const patients = Array.from({ length: 10 }, (_, i) => ({
  id: `PATIENT-${String(i + 1).padStart(3, "0")}`,
  name: `Patient ${i + 1}`,
}));

// mocking patient data
function generatePatientData(seed: number) {
  const random = (min: number, max: number, salt = 0) => {
    const x = Math.sin((seed + salt) * 9999) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  };

  const diseaseScore = parseFloat(random(0.5, 3.5, 1).toFixed(1));
  const volume = parseFloat(random(2.8, 4.5, 2).toFixed(2));
  const percentage = Math.floor(random(60, 95, 3));

  // Generate FVC prediction data
  const baselineFVC = random(3.4, 4.0, 4);
  const declineRate = random(0.05, 0.08, 5);

  const fvcData = Array.from({ length: 13 }, (_, i) => {
    const week = i * 2;
    const fvc = Math.max(
      baselineFVC - declineRate * week + random(-0.1, 0.1, week + 6),
      1.8,
    );
    const spread = 0.3 + week * 0.02;
    const reliability = Math.max(
      72,
      Math.min(97, 96 - week * 1.1 + random(-3, 3, week + 20)),
    );
    return {
      week,
      fvc: parseFloat(fvc.toFixed(2)),
      upper: parseFloat((fvc + spread).toFixed(2)),
      lower: parseFloat((fvc - spread).toFixed(2)),
      reliability: parseFloat(reliability.toFixed(0)),
    };
  });

  return { diseaseScore, volume, percentage, fvcData };
}

export function PulmoSightDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0].id);
  const [isDicomModalOpen, setIsDicomModalOpen] = useState(false);

  // Generate patient-specific data based on patient ID
  const patientData = useMemo(() => {
    const seed = parseInt(selectedPatientId.replace(/\D/g, ""), 10);
    return generatePatientData(seed);
  }, [selectedPatientId]);

  const handleSelectPatient = useCallback((id: string) => {
    setSelectedPatientId(id);
  }, []);

  const handleOpenDicomModal = useCallback(() => {
    setIsDicomModalOpen(true);
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-100">
      <Sidebar
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={handleSelectPatient}
        onOpenDicomModal={handleOpenDicomModal}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header patientId={selectedPatientId} />

        <main className="flex-1 overflow-auto p-5">
          <div className="flex h-full flex-col gap-5 lg:flex-row">
            <div className="flex w-full flex-col gap-5 lg:w-[60%]">
              <div className="flex-1 min-h-100">
                <LungVisualization />
              </div>

              <div className="shrink-0">
                <LungVolume
                  volume={patientData.volume}
                  percentage={patientData.percentage}
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-5 lg:w-[40%]">
              <div className="shrink-0">
                <DiseaseScore score={patientData.diseaseScore} />
              </div>

              <div className="flex-1 min-h-75">
                <FVCPrediction data={patientData.fvcData} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DICOM Upload Modal */}
      <DicomModal open={isDicomModalOpen} onOpenChange={setIsDicomModalOpen} />
    </div>
  );
}
