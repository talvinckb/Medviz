"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileArchive, UserPlus, ArrowRight, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { uploadPatient } from "@/lib/api";

interface DicomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DicomModal({ open, onOpenChange, onSuccess }: DicomModalProps) {
  const [step, setStep] = useState<"upload" | "form" | "uploading">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileProcess = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setErrorMsg("Seuls les fichiers .zip sont acceptés.");
      return;
    }
    setErrorMsg("");
    setSelectedFile(file);
    setSelectedFiles(null);
    setStep("form");
  }, []);

  const handleFolderProcess = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const dcmFiles = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".dcm"),
    );
    if (dcmFiles.length === 0) {
      setErrorMsg("Aucun fichier .dcm trouvé dans le dossier.");
      return;
    }
    setErrorMsg("");
    setSelectedFiles(dcmFiles);
    setSelectedFile(null);
    setStep("form");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const fileList = e.dataTransfer.files;
      if (fileList && fileList.length > 0) {
        if (
          fileList.length === 1 &&
          fileList[0].name.toLowerCase().endsWith(".zip")
        ) {
          handleFileProcess(fileList[0]);
        } else {
          handleFolderProcess(fileList);
        }
      }
    },
    [handleFileProcess, handleFolderProcess],
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
    setSelectedFile(null);
    setSelectedFiles(null);
    onOpenChange(false);
  };

  const handleFinish = () => {
    handleClose();
    if (onSuccess) onSuccess();
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile && (!selectedFiles || selectedFiles.length === 0)) return;

    const formData = new FormData(e.currentTarget);

    if (selectedFile) {
      formData.append("file", selectedFile);
    } else if (selectedFiles) {
      selectedFiles.forEach((f) => {
        formData.append("files", f, f.webkitRelativePath || f.name);
      });
    }

    // Add missing required fields not in original form
    const name = formData.get("name") as string;
    if (!name) {
      formData.set("name", `Patient ${Date.now()}`); // fallback
    }

    setStep("uploading");
    setUploadProgress(10); // Start progress

    try {
      // We simulate progress since fetch doesn't natively support upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      await uploadPatient(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);
      handleFinish();
    } catch (error: any) {
      setErrorMsg(error.message || "Erreur lors de l'upload");
      setStep("upload");
    }
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
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors ${
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
              <input
                type="file"
                className="hidden"
                ref={folderInputRef}
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={(e) => handleFolderProcess(e.target.files)}
              />
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Glissez-déposez votre archive ZIP ou vos fichiers .dcm
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  ou cliquez pour parcourir
                </p>
                <div className="mt-4 flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Archive .zip
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Dossier (.dcm)
                  </button>
                </div>
                <p className="mt-4 text-xs text-red-500 font-medium h-4">
                  {errorMsg}
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
                    name="age"
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
                    name="gender"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Statut fumeur
                  </label>
                  <select
                    required
                    name="smoking_status"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Never smoked">Jamais fumé</option>
                    <option value="Ex-smoker">Ancien fumeur</option>
                    <option value="Currently smokes">Fumeur actuel</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Taille (cm)
                  </label>
                  <input
                    required
                    name="height"
                    type="number"
                    step="1"
                    min="50"
                    max="300"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ex: 175"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Première prise de la FVC (mL)
                  <div className="group relative flex items-center">
                    <Info className="h-4 w-4 text-gray-400 hover:text-blue-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-gray-800 p-3 text-xs text-white shadow-lg group-hover:block z-50 text-center leading-relaxed">
                      La Capacité Vitale Forcée (FVC) est le volume maximal
                      d'air expiré avec force après une inspiration profonde.
                      <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </label>
                <input
                  required
                  name="fvc_baseline"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="ex: 3500"
                />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
