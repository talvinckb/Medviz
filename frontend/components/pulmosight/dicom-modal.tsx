"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  FileArchive,
  CheckCircle,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface DicomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DicomModal({ open, onOpenChange }: DicomModalProps) {
  const [step, setStep] = useState<"upload" | "uploading" | "form" | "success">(
    "upload",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const simulateUpload = useCallback(() => {
    setStep("uploading");
    setUploadProgress(0);
    setErrorMsg("");

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep("form");
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  }, []);

  const handleFileProcess = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setErrorMsg("Seuls les fichiers .zip sont acceptés.");
        return;
      }
      simulateUpload();
    },
    [simulateUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      handleFileProcess(file);
    },
    [handleFileProcess],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      handleFileProcess(file);
    },
    [handleFileProcess],
  );

  const handleClose = () => {
    setStep("upload");
    setUploadProgress(0);
    setErrorMsg("");
    onOpenChange(false);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("success");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {step === "form" ? (
              <UserPlus className="h-5 w-5 text-blue-500" />
            ) : (
              <FileArchive className="h-5 w-5 text-blue-500" />
            )}
            {step === "form"
              ? "Informations du patient"
              : "Importer un dossier DICOM"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {step === "upload" && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <input
                type="file"
                accept=".zip"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Glissez-déposez votre archive ZIP
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  ou cliquez pour parcourir
                </p>
                <p className="mt-2 text-xs text-red-500 font-medium">
                  {errorMsg || "Format .zip uniquement"}
                </p>
              </div>
            </div>
          )}

          {step === "uploading" && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <FileArchive className="h-8 w-8 animate-pulse text-blue-500" />
              </div>
              <div className="w-full max-w-xs">
                <p className="mb-2 text-center text-sm font-medium text-gray-700">
                  Importation en cours...
                </p>
                <Progress value={uploadProgress} className="h-2" />
                <p className="mt-2 text-center text-xs text-gray-500">
                  {uploadProgress}%
                </p>
              </div>
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Âge
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="150"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ex: 45"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sexe
                  </label>
                  <select
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="H">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Taille (cm)
                  </label>
                  <input
                    required
                    type="number"
                    min="50"
                    max="250"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ex: 175"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Base FVC (L)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ex: 3.50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Statut fumeur
                </label>
                <select
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sélectionner...</option>
                  <option value="non_fumeur">Non fumeur</option>
                  <option value="fumeur">Fumeur actif</option>
                  <option value="ancien_fumeur">Ancien fumeur</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Analyser et visualiser
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-green-700">
                  Dossier créé avec succès !
                </p>
                <p className="mt-1 text-xs text-green-600">
                  Les données sont prêtes à être visualisées.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                Terminer
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
