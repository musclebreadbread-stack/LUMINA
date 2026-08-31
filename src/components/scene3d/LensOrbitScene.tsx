"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  LENS_SCENE_PALETTES,
  type LensScenePalette,
  type LensScenePreset,
} from "@/lib/scene3dAssets";

interface Props {
  readonly preset: LensScenePreset;
  readonly frameStep: 1 | 2;
  readonly onContextLost: () => void;
}

function useFrameTicker(frameStep: 1 | 2): () => boolean {
  const frame = useRef(0);
  return () => {
    frame.current += 1;
    return frame.current % frameStep === 0;
  };
}

function ContextGuard({ onContextLost }: { readonly onContextLost: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => canvas.removeEventListener("webglcontextlost", onContextLost);
  }, [gl, onContextLost]);

  return null;
}

function OrbitRings({ palette, frameStep, preset }: { readonly palette: LensScenePalette; readonly frameStep: 1 | 2; readonly preset: LensScenePreset }) {
  const group = useRef<THREE.Group>(null);
  const shouldUpdate = useFrameTicker(frameStep);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    const seconds = clock.getElapsedTime();
    group.current.rotation.x = Math.sin(seconds * 0.13) * 0.16;
    group.current.rotation.y = seconds * 0.08;
    group.current.rotation.z = seconds * (preset === "relationship" ? -0.055 : 0.045);
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2.45, 0.18, 0.25]}>
        <torusGeometry args={[0.95, 0.014, 6, 64]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[0.38, Math.PI / 2.2, -0.3]}>
        <torusGeometry args={[0.78, 0.01, 6, 64]} />
        <meshBasicMaterial color={palette.secondary} transparent opacity={0.54} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 3.4]}>
        <torusGeometry args={[1.12, 0.008, 6, 64]} />
        <meshBasicMaterial color={palette.tertiary} transparent opacity={0.32} />
      </mesh>
    </group>
  );
}

function OrbitParticles({ palette, frameStep }: { readonly palette: LensScenePalette; readonly frameStep: 1 | 2 }) {
  const points = useRef<THREE.Points>(null);
  const shouldUpdate = useFrameTicker(frameStep);
  const geometry = useMemo(() => {
    const positions = new Float32Array(48 * 3);
    for (let index = 0; index < 48; index += 1) {
      const angle = index * 2.399963;
      const radius = 1.35 + ((index * 29) % 100) / 100 * 1.15;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius;
      positions[index * 3 + 2] = -0.72 + ((index * 17) % 100) / 100 * 1.44;
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return next;
  }, []);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !points.current) return;
    points.current.rotation.z = clock.getElapsedTime() * 0.012;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color={palette.glow} size={0.025} sizeAttenuation transparent opacity={0.62} />
    </points>
  );
}

function Core({ palette, frameStep, preset }: { readonly palette: LensScenePalette; readonly frameStep: 1 | 2; readonly preset: LensScenePreset }) {
  const group = useRef<THREE.Group>(null);
  const shouldUpdate = useFrameTicker(frameStep);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    group.current.rotation.x = clock.getElapsedTime() * 0.12;
    group.current.rotation.y = clock.getElapsedTime() * (preset === "evidence" ? -0.08 : 0.1);
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial
          color={palette.tertiary}
          emissive={palette.primary}
          emissiveIntensity={0.28}
          metalness={0.42}
          roughness={0.3}
          transparent
          opacity={0.76}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.35}>
        <torusGeometry args={[0.46, 0.012, 6, 48]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.58} />
      </mesh>
      {preset === "relationship" ? (
        <>
          <mesh position={[-0.62, 0.08, 0.05]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshBasicMaterial color={palette.secondary} transparent opacity={0.92} />
          </mesh>
          <mesh position={[0.62, -0.08, 0.05]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshBasicMaterial color={palette.primary} transparent opacity={0.92} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 0, 0.28]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.055, 0.62, 4]} />
          <meshBasicMaterial color={palette.glow} transparent opacity={0.76} />
        </mesh>
      )}
    </group>
  );
}

function SceneContent({ preset, frameStep, onContextLost }: Props) {
  const [visible, setVisible] = useState(true);
  const palette = LENS_SCENE_PALETTES[preset];

  useEffect(() => {
    function handleVisibility(): void {
      setVisible(!document.hidden);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <Canvas
      frameloop={visible ? "always" : "demand"}
      dpr={[1, 1.25]}
      camera={{ position: [0, 0, 4.9], fov: 35, near: 0.1, far: 20 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ContextGuard onContextLost={onContextLost} />
      <ambientLight intensity={0.62} color={palette.tertiary} />
      <pointLight color={palette.primary} intensity={0.9} distance={4.4} position={[1.4, 1.3, 2.2]} />
      <pointLight color={palette.secondary} intensity={0.5} distance={3.8} position={[-1.5, -0.8, 1.6]} />
      <OrbitParticles palette={palette} frameStep={frameStep} />
      <OrbitRings palette={palette} frameStep={frameStep} preset={preset} />
      <Core palette={palette} frameStep={frameStep} preset={preset} />
    </Canvas>
  );
}

export function LensOrbitScene(props: Props) {
  return <SceneContent {...props} />;
}
