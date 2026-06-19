"use client";

import React, { Suspense, useRef } from "react";
import { RotateCcw, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Environment, Html } from "@react-three/drei";
import * as THREE from "three";
import { generate_lung_model } from "@/lib/lung";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(
      "ErrorBoundary caught an error (probably 404 model not found)",
      error,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const ModelFallback = () => (
  <Html center>
    <div className="flex flex-col items-center justify-center rounded-xl bg-white/90 p-6 text-center shadow-lg backdrop-blur-sm border border-gray-200 w-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-3"></div>
      <p className="text-gray-800 font-semibold">Modèle non disponible</p>
      <p className="text-gray-500 text-xs mt-1">
        Le modèle 3D est peut-être en cours de génération ou introuvable.
      </p>
    </div>
  </Html>
);

function LungModel({ patientId }: { patientId: number }) {
  const lungModel = generate_lung_model(patientId);
  return <primitive object={lungModel} scale={0.1} />;
}

interface LungVisualizationProps {
  patientId: number;
  lung_volume?: number;
}

export function LungVisualization({
  patientId,
  lung_volume,
}: LungVisualizationProps) {
  const controlsRef = useRef<any>(null);

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;
      const position = controlsRef.current.object.position;
      position.lerp(target, 0.2); // zoom in by 20%
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;
      const position = controlsRef.current.object.position;
      const dir = new THREE.Vector3().subVectors(position, target);
      position.add(dir.multiplyScalar(0.2)); // zoom out by 20%
    }
  };

  const handleRotate = () => {
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(
        controlsRef.current.getAzimuthalAngle() + Math.PI / 4,
      );
    }
  };

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const tools = [
    { icon: RotateCcw, label: "Rotation", onClick: handleRotate },
    { icon: ZoomIn, label: "Zoom +", onClick: handleZoomIn },
    { icon: ZoomOut, label: "Zoom -", onClick: handleZoomOut },
    { icon: RefreshCw, label: "Réinitialiser", onClick: handleReset },
  ];

  return (
    <Card className="relative h-full flex flex-col rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6 gap-4">
        <CardTitle className="text-[15px] font-semibold text-gray-800">
          Visualisation 3D des poumons
        </CardTitle>
        {lung_volume !== undefined && lung_volume > 0 && (
          <div className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md font-semibold border border-blue-100">
            Volume pulmonaire :{" "}
            <span className="font-bold">{lung_volume.toFixed(2)} mL</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="relative flex flex-1 items-center justify-center p-0">
        {/* Toolbar */}
        <div className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 rounded-lg bg-white/80 p-2 shadow-md backdrop-blur-sm">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <button
                key={index}
                onClick={tool.onClick}
                className="flex h-9 w-9 items-center justify-center rounded-md transition-colors bg-white text-gray-600 hover:bg-gray-200"
                title={tool.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        {/* Lung Visualization */}
        <div className="h-full w-full bg-gray-50/50 rounded-b-xl">
          <Canvas
            camera={{ position: [0, 0, 50], fov: 45 }}
            className="cursor-grab"
          >
            <Suspense fallback={null}>
              <Environment preset="city" />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Center>
                <ErrorBoundary fallback={<ModelFallback />}>
                  <LungModel patientId={patientId} />
                </ErrorBoundary>
              </Center>
            </Suspense>
            <OrbitControls ref={controlsRef} makeDefault />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  );
}
