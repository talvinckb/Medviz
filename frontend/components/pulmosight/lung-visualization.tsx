"use client";

import { useState, Suspense, useRef } from "react";
import {
  Box,
  Layers,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Environment } from "@react-three/drei";
import * as THREE from "three";
import { generate_lung_model } from "@/lib/lung";

function LungModel() {
  const lungModel = generate_lung_model();
  return <primitive object={lungModel} scale={0.1} />;
}

export function LungVisualization() {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
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
    {
      icon: Box,
      label: "3D",
      active: viewMode === "3d",
      onClick: () => setViewMode("3d"),
    },
    {
      icon: Layers,
      label: "2D",
      active: viewMode === "2d",
      onClick: () => setViewMode("2d"),
    },
    { icon: RotateCcw, label: "Rotation", onClick: handleRotate },
    { icon: ZoomIn, label: "Zoom +", onClick: handleZoomIn },
    { icon: ZoomOut, label: "Zoom -", onClick: handleZoomOut },
    { icon: RefreshCw, label: "Réinitialiser", onClick: handleReset },
  ];

  return (
    <Card className="relative h-full flex flex-col rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="pb-4 pt-6 px-6">
        <CardTitle className="text-[15px] font-semibold text-gray-800">
          Visualisation 3D des poumons
        </CardTitle>
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
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  tool.active
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-200",
                )}
                title={tool.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        {/* Lung Visualization */}
        <div className="h-full w-full bg-gray-50/50 rounded-b-xl">
          {viewMode === "3d" ? (
            <Canvas
              camera={{ position: [0, 0, 50], fov: 45 }}
              className="cursor-grab"
            >
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Center>
                  <LungModel />
                </Center>
              </Suspense>
              <OrbitControls ref={controlsRef} makeDefault />
            </Canvas>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-sm font-medium text-gray-600">
                Vue 2D - Coupe par coupe
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((slice) => (
                  <div
                    key={slice}
                    className="flex h-16 w-16 items-center justify-center rounded-lg bg-linear-to-br from-blue-100 to-green-100 shadow-inner"
                  >
                    <span className="text-xs font-medium text-gray-500">
                      Coupe {slice}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
