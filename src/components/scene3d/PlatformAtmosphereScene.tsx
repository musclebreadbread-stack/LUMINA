"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  PLATFORM_SCENE_BUDGET,
  PLATFORM_SCENE_MODEL_SRC,
  type LensScenePalette,
} from "@/lib/scene3dAssets";

interface Props {
  readonly palette: LensScenePalette;
  readonly frameStep: 1 | 2;
  readonly onContextLost: () => void;
  readonly placement?: "center" | "edge";
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

function DocumentVisibility({ children }: { readonly children: (visible: boolean) => ReactNode }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = (): void => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return children(visible);
}

function SignalField({
  palette,
  frameStep,
  placement,
}: {
  readonly palette: LensScenePalette;
  readonly frameStep: 1 | 2;
  readonly placement: "center" | "edge";
}) {
  const points = useRef<THREE.Points>(null);
  const shouldUpdate = useFrameTicker(frameStep);
  const geometry = useMemo(() => {
    const positions = new Float32Array(PLATFORM_SCENE_BUDGET.maxParticles * 3);
    for (let index = 0; index < PLATFORM_SCENE_BUDGET.maxParticles; index += 1) {
      const angle = index * 2.399963;
      const radius = 2.2 + ((index * 31) % 100) / 100 * 1.8;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius;
      positions[index * 3 + 2] = -1.2 + ((index * 17) % 100) / 100 * 2.2;
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return next;
  }, []);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !points.current) return;
    points.current.rotation.z = clock.getElapsedTime() * 0.008;
  });

  return (
    <points
      ref={points}
      geometry={geometry}
      position={placement === "edge" ? [1.12, 0.34, -0.45] : [0, 0, 0]}
      scale={placement === "edge" ? 0.58 : 1}
    >
      <pointsMaterial color={palette.glow} size={0.022} sizeAttenuation transparent opacity={0.56} />
    </points>
  );
}

function ProceduralObservatory({
  palette,
  frameStep,
  placement,
}: {
  readonly palette: LensScenePalette;
  readonly frameStep: 1 | 2;
  readonly placement: "center" | "edge";
}) {
  const group = useRef<THREE.Group>(null);
  const shouldUpdate = useFrameTicker(frameStep);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    const seconds = clock.getElapsedTime();
    group.current.rotation.x = Math.sin(seconds * 0.14) * 0.12;
    group.current.rotation.y = seconds * 0.075;
    group.current.rotation.z = seconds * -0.035;
  });

  return (
    <group
      ref={group}
      position={placement === "edge" ? [1.45, 0.44, -0.2] : [0, 0, 0]}
      scale={placement === "edge" ? 0.48 : 0.88}
    >
      <mesh>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial
          color={palette.tertiary}
          emissive={palette.primary}
          emissiveIntensity={0.3}
          metalness={0.52}
          roughness={0.28}
          transparent
          opacity={0.78}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0.2, 0.1]}>
        <torusGeometry args={[0.74, 0.012, 6, 48]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[0.42, Math.PI / 2.25, -0.28]}>
        <torusGeometry args={[0.98, 0.009, 6, 48]} />
        <meshBasicMaterial color={palette.secondary} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.34]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.045, 0.52, 4]} />
        <meshBasicMaterial color={palette.glow} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function BlenderObservatory({
  frameStep,
  placement,
}: {
  readonly frameStep: 1 | 2;
  readonly placement: "center" | "edge";
}) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(PLATFORM_SCENE_MODEL_SRC);
  const { actions } = useAnimations(gltf.animations, group);
  const action = Object.values(actions).find((candidate) => Boolean(candidate));
  const shouldUpdate = useFrameTicker(frameStep);

  useEffect(() => {
    if (!action) return;
    action.reset().fadeIn(0.7).play();
    return () => {
      action.fadeOut(0.7);
      action.stop();
    };
  }, [action]);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    const seconds = clock.getElapsedTime();
    group.current.rotation.x = Math.sin(seconds * 0.12) * 0.1;
    group.current.rotation.y = seconds * 0.06;
  });

  return (
    <group
      ref={group}
      position={placement === "edge" ? [1.45, 0.44, -0.2] : [0, 0, 0]}
      scale={placement === "edge" ? 0.48 : 0.86}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

interface SceneErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
}

interface SceneErrorBoundaryState {
  readonly failed: boolean;
}

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SceneContent({ palette, frameStep, onContextLost, placement = "center" }: Props) {
  return (
    <DocumentVisibility>
      {(visible) => (
        <Canvas
          frameloop={visible ? "always" : "demand"}
          dpr={[1, PLATFORM_SCENE_BUDGET.maxDevicePixelRatio]}
          camera={{ position: [0, 0, 5.2], fov: 34, near: 0.1, far: 24 }}
          gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ContextGuard onContextLost={onContextLost} />
          <ambientLight intensity={0.55} color={palette.tertiary} />
          <pointLight color={palette.primary} intensity={0.82} distance={5.5} position={[1.7, 1.4, 2.6]} />
          <pointLight color={palette.secondary} intensity={0.42} distance={4.2} position={[-1.8, -1.1, 1.8]} />
          <SignalField palette={palette} frameStep={frameStep} placement={placement} />
          <SceneErrorBoundary fallback={<ProceduralObservatory palette={palette} frameStep={frameStep} placement={placement} />}>
            <Suspense fallback={<ProceduralObservatory palette={palette} frameStep={frameStep} placement={placement} />}>
              <BlenderObservatory frameStep={frameStep} placement={placement} />
            </Suspense>
          </SceneErrorBoundary>
        </Canvas>
      )}
    </DocumentVisibility>
  );
}

export function PlatformAtmosphereScene(props: Props) {
  return <SceneContent {...props} />;
}
