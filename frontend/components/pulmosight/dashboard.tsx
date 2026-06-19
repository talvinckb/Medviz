"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Inbox } from "lucide-react";
import { Sidebar } from "@/components/pulmosight/sidebar";
import { Header } from "@/components/pulmosight/header";
import { LungVisualization } from "@/components/pulmosight/lung-visualization";
import { DiseaseScore } from "@/components/pulmosight/disease-score";
import { FVCPrediction } from "@/components/pulmosight/fvc-prediction";
import { DicomModal } from "@/components/pulmosight/dicom-modal";
import { getPatients, getPatientData, deletePatient } from "@/lib/api";
import { PatientDetail } from "@/types/types";

export function PulmoSightDashboard() {
  const [patientIds, setPatientIds] = useState<number[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null,
  );
  const [patientData, setPatientData] = useState<PatientDetail | null>(null);
  const [isDicomModalOpen, setIsDicomModalOpen] = useState(false);

  // Fetch patient list on mount
  const loadPatients = useCallback(async () => {
    try {
      const ids = await getPatients();
      const sortedIds = ids.sort((a, b) => b - a);
      setPatientIds(sortedIds);
      if (sortedIds.length > 0 && selectedPatientId === null) {
        setSelectedPatientId(sortedIds[0]);
      }
    } catch (error) {
      console.error("Failed to load patients", error);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Fetch patient data when selection changes
  useEffect(() => {
    async function loadPatientData() {
      if (selectedPatientId !== null) {
        try {
          const data = await getPatientData(selectedPatientId);
          setPatientData(data);
        } catch (error) {
          console.error(
            `Failed to load data for patient ${selectedPatientId}`,
            error,
          );
          setPatientData(null);
        }
      }
    }
    loadPatientData();
  }, [selectedPatientId]);

  const handleSelectPatient = useCallback((id: string) => {
    setSelectedPatientId(Number(id));
  }, []);

  const handleOpenDicomModal = useCallback(() => {
    setIsDicomModalOpen(true);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    setIsDicomModalOpen(false);
    setSelectedPatientId(null); // Force selection of the newest patient on next load
    loadPatients();
  }, [loadPatients]);

  const handleDeletePatient = useCallback(async () => {
    if (selectedPatientId === null) return;

    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer le patient ${selectedPatientId} ? Cette action est irréversible.`,
      )
    ) {
      return;
    }

    try {
      await deletePatient(selectedPatientId);
      setSelectedPatientId(null);
      loadPatients();
    } catch (error) {
      console.error("Failed to delete patient", error);
      alert("Erreur lors de la suppression du patient");
    }
  }, [selectedPatientId, loadPatients]);

  const sidebarPatients = useMemo(() => {
    return patientIds.map((id) => ({
      id: id.toString(),
      name: patientData?.id === id ? patientData.name : `Patient ${id}`,
    }));
  }, [patientIds, patientData]);

  const volume = patientData?.lung_volume || 0;
  const percentage = 100; // TODO: Calculate percentage on real data
  const diseaseScore = patientData?.sickness_value || 0;
  const fibrosisRatio = patientData?.fibrosis_ratio || 0;
  const optimalFvc = patientData?.optimal_fvc || 0;

  const fvcData = useMemo(() => {
    if (!patientData?.fvc_records) return [];
    return patientData.fvc_records.map((record) => {
      // Reconstruct sigma (standard deviation in mL) from the confidence value
      // confidence = max(0.1, 1.0 - (sigma - 70) / 300.0)
      const sigma = 70 + 300 * (1 - record.confidence);
      const sigmaLiters = sigma / 1000.0;
      // 95% confidence interval width is approximately 1.96 * sigma
      const margin = 1.96 * sigmaLiters;
      return {
        week: record.week_num,
        fvc: record.fvc,
        upper: record.fvc + margin,
        lower: Math.max(0, record.fvc - margin),
        reliability: record.confidence * 100,
      };
    });
  }, [patientData]);

  const isProcessing = patientData && !patientData.glb_path;
  const isLoading = selectedPatientId && !patientData;

  // Polling when patient is processing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollData = async () => {
      if (!selectedPatientId) return;
      try {
        const newData = await getPatientData(selectedPatientId);
        setPatientData(newData);
      } catch (error) {
        console.error("Error polling patient data", error);
      }
    };

    if (isProcessing) {
      interval = setInterval(pollData, 3000); // 3 seconds interval to check for updates
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, selectedPatientId]);

  return (
    <div className="flex h-screen w-full bg-gray-100">
      <Sidebar
        patients={sidebarPatients}
        selectedPatientId={selectedPatientId?.toString() || ""}
        onSelectPatient={handleSelectPatient}
        onOpenDicomModal={handleOpenDicomModal}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          patientId={selectedPatientId?.toString() || ""}
          patientInfo={
            patientData
              ? {
                  name: patientData.name,
                  age: patientData.age,
                  gender: patientData.gender,
                  height: patientData.height,
                  smoking_status: patientData.smoking_status,
                }
              : undefined
          }
          onDelete={selectedPatientId ? handleDeletePatient : undefined}
        />

        <main className="flex-1 overflow-auto p-5">
          {!selectedPatientId ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 mb-4">
                <Inbox className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-800">
                Aucun patient sélectionné
              </h3>
              <p className="mb-6 max-w-sm text-gray-500">
                Sélectionnez un patient dans la liste ou ajoutez un nouveau
                dossier DICOM pour commencer l'analyse.
              </p>
              <button
                onClick={handleOpenDicomModal}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer shadow-sm"
              >
                Ajouter un patient
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : isProcessing ? (
            // When the patient is being processed
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Analyse en cours...
                </h3>
                <p className="max-w-md text-gray-500">
                  La segmentation du poumon et le calcul des scores cliniques
                  sont en cours. Cette opération peut prendre quelques minutes.
                  La page s'actualisera automatiquement une fois terminée.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 h-full">
              {/* Upper Section: 3D Visualization and Disease Score */}
              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 min-h-100">
                  <LungVisualization
                    patientId={selectedPatientId}
                    lung_volume={volume}
                  />
                </div>
                <div className="flex-1 min-h-100">
                  <DiseaseScore
                    sickness_value={diseaseScore}
                    fibrosis_ratio={fibrosisRatio}
                    fvc_baseline={
                      patientData?.fvc_records.find((r) => r.week_num === 0)
                        ?.fvc || 0
                    }
                    optimal_fvc={optimalFvc}
                    fvc_records={patientData?.fvc_records || []}
                  />
                </div>
              </div>

              {/* Lower Section: Full-width FVC Prediction */}
              <div className="w-full min-h-120">
                <FVCPrediction data={fvcData} fvc_optimal={optimalFvc} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DICOM Upload Modal */}
      <DicomModal
        open={isDicomModalOpen}
        onOpenChange={setIsDicomModalOpen}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
