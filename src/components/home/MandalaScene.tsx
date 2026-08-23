"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MandalaModel, MandalaNodeModel } from "@/lib/mandalaModel";

interface Props {
  readonly model: MandalaModel;
  readonly frameStep: 1 | 2;
  readonly onContextLost: () => void;
}

const ELEMENT_LIGHTS = ["#5ba383", "#d95b41", "#dfa83e", "#b9bfc4", "#5580d4"] as const;
const DEG_TO_RAD = Math.PI / 180;

function ContextGuard({ onContextLost }: { readonly onContextLost: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => canvas.removeEventListener("webglcontextlost", onContextLost);
  }, [gl, onContextLost]);

  return null;
}

function useFrameTicker(frameStep: 1 | 2): () => boolean {
  const frame = useRef(0);
  return () => {
    frame.current += 1;
    return frame.current % frameStep === 0;
  };
}

function OrbitTexture({ node, frameStep, index }: { readonly node: MandalaNodeModel; readonly frameStep: 1 | 2; readonly index: number }) {
  const texture = useTexture(node.textureSrc);
  const group = useRef<THREE.Group>(null);
  const shouldUpdate = useFrameTicker(frameStep);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    const seconds = clock.getElapsedTime();
    const direction = node.retrograde ? -1 : 1;
    const angle = node.displayLongitude * DEG_TO_RAD + direction * (seconds / node.visualDurationSeconds) * Math.PI * 2;
    const radius = 1.35 + (100 - node.orbitInset) / 70;
    group.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.25 + index * 0.06);
    group.current.rotation.z = -angle;
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.78, 1.04, 0.08]} />
        <meshStandardMaterial color="#1e1a15" metalness={0.72} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[0.72, 0.96]} />
        <meshBasicMaterial map={texture} transparent opacity={0.94} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StarField({ frameStep }: { readonly frameStep: 1 | 2 }) {
  const shouldUpdate = useFrameTicker(frameStep);
  const group = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(96 * 3);
    for (let i = 0; i < 96; i += 1) {
      const angle = i * 2.399963;
      const radius = 2.6 + ((i * 37) % 100) / 100 * 2.4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -1.5 + ((i * 17) % 100) / 100 * 2;
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return next;
  }, []);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    group.current.rotation.z = clock.getElapsedTime() * 0.004;
  });

  return (
    <points ref={group} geometry={geometry}>
      <pointsMaterial color="#ede6d8" size={0.025} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
}

function ElementLights({ frameStep }: { readonly frameStep: 1 | 2 }) {
  const group = useRef<THREE.Group>(null);
  const shouldUpdate = useFrameTicker(frameStep);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    group.current.rotation.z = clock.getElapsedTime() * 0.018;
    group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.12) * 0.1;
  });

  return (
    <group ref={group}>
      {ELEMENT_LIGHTS.map((color, index) => {
        const angle = (index / ELEMENT_LIGHTS.length) * Math.PI * 2;
        return (
          <pointLight
            key={color}
            color={color}
            intensity={0.42}
            distance={4.8}
            position={[Math.cos(angle) * 2, Math.sin(angle) * 2, 1.1]}
          />
        );
      })}
    </group>
  );
}

function CenterOrb({ frameStep }: { readonly frameStep: 1 | 2 }) {
  const group = useRef<THREE.Group>(null);
  const shouldUpdate = useFrameTicker(frameStep);

  useFrame(({ clock }) => {
    if (!shouldUpdate() || !group.current) return;
    group.current.rotation.x = clock.getElapsedTime() * 0.09;
    group.current.rotation.y = clock.getElapsedTime() * 0.14;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial
          color="#ede6d8"
          emissive="#dfa83e"
          emissiveIntensity={0.34}
          metalness={0.25}
          roughness={0.28}
          transparent
          opacity={0.72}
        />
      </mesh>
      <mesh scale={1.42}>
        <torusGeometry args={[0.55, 0.012, 8, 64]} />
        <meshBasicMaterial color="#ede6d8" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function SceneContent({
  model,
  frameStep,
  onContextLost,
}: {
  readonly model: MandalaModel;
  readonly frameStep: 1 | 2;
  readonly onContextLost: () => void;
}) {
  const [visible, setVisible] = useState(true);

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
      camera={{ position: [0, 0, 6.8], fov: 35, near: 0.1, far: 30 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ContextGuard onContextLost={onContextLost} />
      <ambientLight intensity={0.68} color="#ede6d8" />
      <ElementLights frameStep={frameStep} />
      <StarField frameStep={frameStep} />
      <CenterOrb frameStep={frameStep} />
      {model.nodes.map((node, index) => (
        <OrbitTexture key={node.key} node={node} index={index} frameStep={frameStep} />
      ))}
    </Canvas>
  );
}

export function MandalaScene({ model, frameStep, onContextLost }: Props) {
  return <SceneContent model={model} frameStep={frameStep} onContextLost={onContextLost} />;
}
