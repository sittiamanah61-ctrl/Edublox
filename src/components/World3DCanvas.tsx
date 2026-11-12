import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { AppConfig, MaterialModule, PlayerState } from '../types/game';
import { AVATAR_PRESETS } from '../data/dkvData';
import { SoundFX } from '../utils/sound';

export interface World3DHandle {
  rotateCameraBy: (delta: number) => void;
  zoomCameraBy: (delta: number) => void;
  cycleCameraFocus: () => string;
  returnPlayersToPlaza: () => void;
  teleportToCoords: (x: number, z: number) => void;
  triggerPlayerJump: (idx: number) => void;
  setVirtualKey: (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void;
  pulseBuilding: (materialId: string) => void;
}

interface World3DCanvasProps {
  appConfig: AppConfig;
  materials: MaterialModule[];
  players: PlayerState[];
  isStartScreen: boolean;
  isAutoMove: boolean;
  activeTouchPlayerIndex: number;
  isQuizActive: boolean;
  onProximityChange: (buildingId: string | null) => void;
  onQuizShortcutKey?: (code: string) => void;
}

interface BuildingMeshEntry {
  id: string;
  group: THREE.Group;
  portalPadPos: THREE.Vector3;
  centerPos: THREE.Vector3;
}

interface PlayerMeshEntry {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  tagEl: HTMLDivElement;
}

// Pre-allocated math helpers outside the animation loop (zero per-frame GC allocations)
const _headPos = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _smoothedTarget = new THREE.Vector3(0, 2, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createVoxelBox(
  w: number,
  h: number,
  d: number,
  color: string | number,
  x = 0,
  y = 0,
  z = 0,
  castShadow = true,
  roughness = 0.72,
  metalness = 0.08
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function createSignTexture(
  title: string,
  subtitle: string,
  bgColor: string,
  badgeText: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(36, 28, 440, 42);
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText.toUpperCase(), 256, 56);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Fredoka, sans-serif';
    const safeTitle = title.length > 26 ? title.slice(0, 25) + '…' : title;
    ctx.fillText(safeTitle, 256, 128);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 21px Nunito, sans-serif';
    const safeSub = subtitle.length > 36 ? subtitle.slice(0, 35) + '…' : subtitle;
    ctx.fillText(safeSub, 256, 182);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) std.map.dispose();
        m.dispose();
      });
    }
  });
}

export const World3DCanvas = forwardRef<World3DHandle, World3DCanvasProps>(
  function World3DCanvas(
    {
      appConfig,
      materials,
      players,
      isStartScreen,
      isAutoMove,
      activeTouchPlayerIndex,
      isQuizActive,
      onProximityChange,
      onQuizShortcutKey,
    },
    ref
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const nametagsRef = useRef<HTMLDivElement | null>(null);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    // Mutable refs synced from props so the 3D scene never tears down on UI updates
    const propsRef = useRef({
      appConfig,
      materials,
      players,
      isStartScreen,
      isAutoMove,
      activeTouchPlayerIndex,
      isQuizActive,
      onProximityChange,
      onQuizShortcutKey,
    });
    propsRef.current = {
      appConfig,
      materials,
      players,
      isStartScreen,
      isAutoMove,
      activeTouchPlayerIndex,
      isQuizActive,
      onProximityChange,
      onQuizShortcutKey,
    };

    const engineRef = useRef<{
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
      maxAnisotropy: number;
      buildingEntries: BuildingMeshEntry[];
      playerEntries: PlayerMeshEntry[];
      monumentSignMesh: THREE.Mesh | null;
      cameraOrbitAngle: number;
      cameraTargetOrbit: number;
      cameraPitchAngle: number;
      cameraDistance: number;
      cameraTargetDistance: number;
      cameraFocusMode: number;
      keysDown: Record<string, boolean>;
      virtualPad: { up: boolean; down: boolean; left: boolean; right: boolean };
      lastNearbyId: string | null;
      rebuildBuildings: () => void;
      rebuildPlayers: () => void;
      updateMonumentSign: () => void;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      rotateCameraBy(delta: number) {
        if (engineRef.current) {
          engineRef.current.cameraTargetOrbit += delta;
        }
      },
      zoomCameraBy(delta: number) {
        if (engineRef.current) {
          engineRef.current.cameraTargetDistance = Math.max(
            14,
            Math.min(58, engineRef.current.cameraTargetDistance + delta)
          );
        }
      },
      cycleCameraFocus(): string {
        const eng = engineRef.current;
        if (!eng) return 'Pemain 1 (P1)';
        const total = 2 + eng.buildingEntries.length;
        eng.cameraFocusMode = (eng.cameraFocusMode + 1) % total;
        if (eng.cameraFocusMode === 0) return 'Pemain 1 (P1)';
        if (eng.cameraFocusMode === 1) return 'Panorama Plaza Kota';
        const mat = propsRef.current.materials[eng.cameraFocusMode - 2];
        return mat ? mat.namaGedung : 'Gedung';
      },
      returnPlayersToPlaza() {
        const eng = engineRef.current;
        if (!eng) return;
        propsRef.current.players.forEach((p, idx) => {
          p.x = (idx - 1.5) * 2.2;
          p.z = 5.5;
          p.y = 0;
          p.vy = 0;
        });
        eng.cameraFocusMode = 0;
        SoundFX.select();
      },
      teleportToCoords(x: number, z: number) {
        const eng = engineRef.current;
        if (!eng) return;
        propsRef.current.players.forEach((p, idx) => {
          if (!p.active) return;
          p.x = x + (idx - 0.5) * 1.6;
          p.z = z + 3.5;
          p.y = 0;
          p.vy = 0;
        });
        eng.cameraFocusMode = 0;
        SoundFX.select();
      },
      triggerPlayerJump(idx: number) {
        const p = propsRef.current.players[idx];
        if (!p || !p.active) return;
        if (p.y <= 0.05) {
          p.vy = 0.28;
          SoundFX.jump();
        }
      },
      setVirtualKey(dir, pressed) {
        if (engineRef.current) {
          engineRef.current.virtualPad[dir] = pressed;
        }
      },
      pulseBuilding(materialId: string) {
        const eng = engineRef.current;
        if (!eng) return;
        const bObj = eng.buildingEntries.find((b) => b.id === materialId);
        if (bObj) {
          bObj.group.scale.set(1.06, 1.06, 1.06);
          window.setTimeout(() => bObj.group.scale.set(1, 1, 1), 240);
        }
      },
    }));

    // Initialize WebGL Scene once
    useEffect(() => {
      const container = mountRef.current;
      const nametagsContainer = nametagsRef.current;
      if (!container || !nametagsContainer) return;

      const isSoftwareGl = detectSoftwareWebGL();
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#87cefa');
      scene.fog = new THREE.Fog('#bae6fd', 62, 155);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        280
      );
      camera.position.set(0, 22, 34);

      // Balanced Warm Key + Cool Hemisphere Fill + Subtle Rim Lighting
      const hemiLight = new THREE.HemisphereLight('#e0f2fe', '#34d399', 0.8);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight('#fff7ed', 1.15);
      keyLight.position.set(28, 48, 26);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 125;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      const d = 42;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight('#bae6fd', 0.4);
      rimLight.position.set(-30, 24, -28);
      scene.add(rimLight);

      // Surrounding sky-ocean horizon plane (prevents boxy floating void)
      const horizonGeo = new THREE.CircleGeometry(180, 48);
      horizonGeo.rotateX(-Math.PI / 2);
      const horizonMat = new THREE.MeshStandardMaterial({
        color: '#67e8f9',
        roughness: 0.25,
        metalness: 0.1,
      });
      const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
      horizonMesh.position.y = -15.5;
      horizonMesh.receiveShadow = true;
      scene.add(horizonMesh);

      // Floating Voxel Island Base (Composite layered bedrock & grass)
      scene.add(createVoxelBox(76, 2, 76, '#4ade80', 0, -1, 0, false, 0.88, 0.02));
      scene.add(createVoxelBox(72, 4, 72, '#92400e', 0, -4, 0, false, 0.92, 0.02));
      scene.add(createVoxelBox(62, 5, 62, '#78350f', 0, -8.5, 0, false, 0.95, 0.02));
      scene.add(createVoxelBox(48, 5, 48, '#64748b', 0, -13.5, 0, false, 0.9, 0.05));

      // Plaza & Connecting Roads (Y offset >= 0.04 to prevent Z-fighting)
      scene.add(createVoxelBox(22, 0.24, 22, '#f8fafc', 0, 0.12, 0, false, 0.5, 0.05));
      scene.add(createVoxelBox(18, 0.28, 18, '#e0f2fe', 0, 0.16, 0, false, 0.4, 0.08));
      scene.add(createVoxelBox(54, 0.2, 5, '#cbd5e1', 0, 0.1, -6, false, 0.78, 0.04));
      scene.add(createVoxelBox(54, 0.2, 5, '#cbd5e1', 0, 0.1, 14, false, 0.78, 0.04));
      scene.add(createVoxelBox(5, 0.2, 58, '#cbd5e1', 0, 0.1, 2, false, 0.78, 0.04));

      // Sun
      const sun = createVoxelBox(8, 8, 8, '#fde047', 35, 42, -38, false, 0.3, 0);
      (sun.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#facc15');
      (sun.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
      scene.add(sun);

      // Moving Voxel Clouds
      const cloudsGroup = new THREE.Group();
      const cloudCoords: [number, number, number][] = [
        [-28, 28, -22],
        [12, 31, -28],
        [30, 27, 10],
        [-32, 30, 18],
        [0, 33, 25],
      ];
      cloudCoords.forEach(([cx, cy, cz]) => {
        const c = new THREE.Group();
        c.add(createVoxelBox(8, 2.5, 5, '#ffffff', 0, 0, 0, false, 0.95, 0));
        c.add(createVoxelBox(5, 2, 4, '#f8fafc', 3, 1.2, 0.5, false, 0.95, 0));
        c.add(createVoxelBox(4, 1.8, 4, '#f1f5f9', -3, 0.9, -0.5, false, 0.95, 0));
        c.position.set(cx, cy, cz);
        cloudsGroup.add(c);
      });
      scene.add(cloudsGroup);

      // Multi-part Composite Voxel Trees
      const treePositions: [number, number][] = [
        [-32, -28],
        [-12, -30],
        [12, -30],
        [32, -28],
        [-33, 4],
        [33, 4],
        [-32, 28],
        [32, 28],
        [-14, 30],
        [14, 30],
      ];
      treePositions.forEach(([tx, tz]) => {
        const tree = new THREE.Group();
        tree.add(createVoxelBox(1.4, 4, 1.4, '#78350f', 0, 2, 0, true, 0.92, 0.02));
        tree.add(createVoxelBox(4.5, 3.2, 4.5, '#16a34a', 0, 5.2, 0, true, 0.78, 0.02));
        tree.add(createVoxelBox(3, 2.5, 3, '#22c55e', 0, 7.5, 0, true, 0.72, 0.02));
        tree.position.set(tx, 0, tz);
        scene.add(tree);
      });

      // InstancedMesh Flower Ring around Plaza
      const flowerPositions: [number, number, string][] = [];
      const flowerColors = ['#f43f5e', '#facc15', '#a855f7', '#fb923c', '#38bdf8'];
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const radius = 12.2 + (i % 2) * 1.1;
        const fx = Math.cos(angle) * radius;
        const fz = Math.sin(angle) * radius;
        if (Math.abs(fx) < 3.5 || Math.abs(fz) < 3.5) continue;
        flowerPositions.push([fx, fz, flowerColors[i % flowerColors.length]]);
      }
      if (flowerPositions.length > 0) {
        const stemGeo = new THREE.BoxGeometry(0.3, 0.7, 0.3);
        const stemMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.85 });
        const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, flowerPositions.length);

        const petalGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
        const petalMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
        const petalInst = new THREE.InstancedMesh(petalGeo, petalMat, flowerPositions.length);

        const dummy = new THREE.Object3D();
        const col = new THREE.Color();
        flowerPositions.forEach(([fx, fz, hex], idx) => {
          dummy.position.set(fx, 0.35, fz);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          stemInst.setMatrixAt(idx, dummy.matrix);

          const s = 0.88 + (idx % 3) * 0.12;
          dummy.position.set(fx, 0.85, fz);
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          petalInst.setMatrixAt(idx, dummy.matrix);
          petalInst.setColorAt(idx, col.set(hex));
        });
        stemInst.instanceMatrix.needsUpdate = true;
        petalInst.instanceMatrix.needsUpdate = true;
        if (petalInst.instanceColor) petalInst.instanceColor.needsUpdate = true;
        stemInst.computeBoundingSphere();
        petalInst.computeBoundingSphere();
        scene.add(stemInst, petalInst);
      }

      // 4 Park Benches (Composite 5-part furniture)
      [
        [-8.5, -8.5],
        [8.5, -8.5],
        [-8.5, 8.5],
        [8.5, 8.5],
      ].forEach(([bx, bz]) => {
        const bench = new THREE.Group();
        bench.add(createVoxelBox(3.2, 0.35, 1.2, '#b45309', 0, 0.85, 0, true, 0.8, 0.05));
        bench.add(createVoxelBox(3.2, 1.0, 0.25, '#92400e', 0, 1.45, -0.45, true, 0.8, 0.05));
        bench.add(createVoxelBox(0.35, 0.85, 1.0, '#475569', -1.2, 0.42, 0, true, 0.35, 0.7));
        bench.add(createVoxelBox(0.35, 0.85, 1.0, '#475569', 1.2, 0.42, 0, true, 0.35, 0.7));
        bench.position.set(bx, 0, bz);
        bench.lookAt(0, 0, 0);
        scene.add(bench);
      });

      // Creativity Fountain (0, -15)
      const fountain = new THREE.Group();
      fountain.position.set(0, 0, -15);
      fountain.add(createVoxelBox(5.5, 0.8, 5.5, '#94a3b8', 0, 0.4, 0, true, 0.65, 0.1));
      fountain.add(createVoxelBox(4.5, 0.9, 4.5, '#38bdf8', 0, 0.5, 0, false, 0.15, 0.1));
      fountain.add(createVoxelBox(1.4, 2.5, 1.4, '#cbd5e1', 0, 1.25, 0, true, 0.55, 0.15));
      const fountainWater = createVoxelBox(2.2, 1.2, 2.2, '#7dd3fc', 0, 2.8, 0, false, 0.12, 0.1);
      fountain.add(fountainWater);
      scene.add(fountain);

      // Central Crystal Monument (0, 0)
      const monumentBase = new THREE.Group();
      monumentBase.position.set(0, 0, 0);
      monumentBase.add(createVoxelBox(6, 0.7, 6, '#1e293b', 0, 0.35, 0, true, 0.4, 0.6));
      monumentBase.add(createVoxelBox(4.4, 0.7, 4.4, '#3b82f6', 0, 1.05, 0, true, 0.35, 0.3));
      monumentBase.add(createVoxelBox(3, 0.6, 3, '#facc15', 0, 1.7, 0, true, 0.22, 0.85));

      const crystalGeo = new THREE.OctahedronGeometry(1.75, 0);
      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: '#06b6d4',
        emissive: '#2563eb',
        emissiveIntensity: 0.28,
        roughness: 0.12,
        metalness: 0.1,
        clearcoat: 1.0,
        transmission: isSoftwareGl ? 0 : 0.75,
        transparent: isSoftwareGl,
        opacity: isSoftwareGl ? 0.85 : 1.0,
        ior: 1.75,
        thickness: 1.4,
        flatShading: true,
      });
      const centralCrystal = new THREE.Mesh(crystalGeo, crystalMat);
      centralCrystal.position.set(0, 4.4, 0);
      centralCrystal.castShadow = !isSoftwareGl;
      monumentBase.add(centralCrystal);

      const monumentSignMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 2.2, 0.3),
        new THREE.MeshBasicMaterial({
          map: createSignTexture(
            propsRef.current.appConfig.appName,
            `${propsRef.current.appConfig.subjectName} • ${propsRef.current.appConfig.className}`,
            '#0f172a',
            propsRef.current.appConfig.arenaTitle,
            maxAnisotropy
          ),
        })
      );
      monumentSignMesh.position.set(0, 7.2, 0);
      monumentBase.add(monumentSignMesh);
      scene.add(monumentBase);

      // DKV Creative Landmarks
      // 1. Color Palette & Giant Paintbrush (-24, -18)
      const paletteGroup = new THREE.Group();
      paletteGroup.position.set(-24, 0, -18);
      paletteGroup.add(createVoxelBox(7, 0.8, 5.5, '#fde68a', 0, 0.4, 0, true, 0.78, 0.05));
      ['#ef4444', '#facc15', '#3b82f6', '#10b981', '#a855f7'].forEach((col, idx) => {
        const ang = (idx / 5) * Math.PI * 1.6;
        paletteGroup.add(
          createVoxelBox(1.2, 0.6, 1.2, col, Math.cos(ang) * 2, 1.0, Math.sin(ang) * 1.6, true, 0.35, 0.05)
        );
      });
      const brush = new THREE.Group();
      brush.add(createVoxelBox(0.55, 6.5, 0.55, '#b45309', 0, 3.2, 0, true, 0.75, 0.05));
      brush.add(createVoxelBox(0.75, 1.1, 0.75, '#cbd5e1', 0, 6.8, 0, true, 0.2, 0.85));
      brush.add(createVoxelBox(1.1, 1.6, 1.1, '#ec4899', 0, 8.0, 0, true, 0.6, 0.05));
      brush.rotation.z = -0.35;
      brush.position.set(1.5, 0.5, 0);
      paletteGroup.add(brush);
      scene.add(paletteGroup);

      // 2. Giant Pencil & Camera Statue (24, -18)
      const toolGroup = new THREE.Group();
      toolGroup.position.set(24, 0, -18);
      toolGroup.add(createVoxelBox(1.6, 6.5, 1.6, '#facc15', -1.8, 3.25, 0, true, 0.6, 0.05));
      toolGroup.add(createVoxelBox(1.6, 1.1, 1.6, '#f43f5e', -1.8, 7.05, 0, true, 0.85, 0.02));
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 2.1, 4),
        new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.75 })
      );
      tip.position.set(-1.8, 8.5, 0);
      tip.rotation.y = Math.PI / 4;
      toolGroup.add(tip);
      toolGroup.add(createVoxelBox(4.4, 2.8, 2.4, '#1e293b', 2.2, 1.4, 0, true, 0.45, 0.5));
      toolGroup.add(createVoxelBox(1.5, 0.7, 1.4, '#64748b', 2.2, 3.1, 0, true, 0.25, 0.85));
      toolGroup.add(createVoxelBox(1.8, 1.8, 1.2, '#38bdf8', 2.2, 1.4, 1.5, true, 0.1, 0.6));
      scene.add(toolGroup);

      // 3. Typography Park "D - K - V" (0, -26)
      const typoGroup = new THREE.Group();
      typoGroup.position.set(0, 0, -26);
      ['D', 'K', 'V'].forEach((letter, idx) => {
        const tex = createSignTexture(
          `HURUF ${letter}`,
          'Taman Tipografi DKV',
          ['#2563EB', '#EC4899', '#10B981'][idx],
          'TIPOGRAFI',
          maxAnisotropy
        );
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 3.6, 1.4),
          new THREE.MeshBasicMaterial({ map: tex })
        );
        block.position.set((idx - 1) * 4.5, 1.8, 0);
        typoGroup.add(block);
      });
      scene.add(typoGroup);

      // 4. Kantin Edublox, Galeri Karya & Robot Mascot (0, 26)
      const canteenGroup = new THREE.Group();
      canteenGroup.position.set(0, 0, 26);
      canteenGroup.add(createVoxelBox(9, 4.2, 5, '#fff7ed', -6, 2.1, 0, true, 0.75, 0.05));
      canteenGroup.add(createVoxelBox(10, 1.1, 6, '#f97316', -6, 4.7, 0, true, 0.55, 0.1));
      const canteenSign = new THREE.Mesh(
        new THREE.BoxGeometry(7, 1.5, 0.3),
        new THREE.MeshBasicMaterial({
          map: createSignTexture('KANTIN EDUBLOX', 'Tukar Koin & Istirahat', '#ea580c', 'AREA KREATIF', maxAnisotropy),
        })
      );
      canteenSign.position.set(-6, 6.0, 2.2);
      canteenGroup.add(canteenSign);

      canteenGroup.add(createVoxelBox(9, 4.5, 5, '#eff6ff', 6, 2.25, 0, true, 0.75, 0.05));
      canteenGroup.add(createVoxelBox(10, 1.0, 6, '#3b82f6', 6, 5.0, 0, true, 0.55, 0.1));
      const gallerySign = new THREE.Mesh(
        new THREE.BoxGeometry(7, 1.5, 0.3),
        new THREE.MeshBasicMaterial({
          map: createSignTexture('GALERI KARYA DKV', 'Pameran Ilustrasi & Studio', '#1d4ed8', 'PAMERAN', maxAnisotropy),
        })
      );
      gallerySign.position.set(6, 6.2, 2.2);
      canteenGroup.add(gallerySign);

      canteenGroup.add(createVoxelBox(2.2, 2.4, 1.6, '#38bdf8', 0, 2.2, 1.5, true, 0.35, 0.45));
      canteenGroup.add(createVoxelBox(1.8, 1.6, 1.6, '#facc15', 0, 4.3, 1.5, true, 0.3, 0.65));
      canteenGroup.add(createVoxelBox(0.3, 0.9, 0.3, '#ef4444', 0, 5.5, 1.5, true, 0.4, 0.2));
      scene.add(canteenGroup);

      const engine = {
        scene,
        camera,
        renderer,
        maxAnisotropy,
        buildingEntries: [] as BuildingMeshEntry[],
        playerEntries: [] as PlayerMeshEntry[],
        monumentSignMesh,
        cameraOrbitAngle: 0,
        cameraTargetOrbit: 0,
        cameraPitchAngle: 0.52,
        cameraDistance: 32,
        cameraTargetDistance: 32,
        cameraFocusMode: 0,
        keysDown: {} as Record<string, boolean>,
        virtualPad: { up: false, down: false, left: false, right: false },
        lastNearbyId: null as string | null,
        updateMonumentSign() {
          const cfg = propsRef.current.appConfig;
          const mat = engine.monumentSignMesh?.material as THREE.MeshBasicMaterial | undefined;
          if (mat) {
            if (mat.map) mat.map.dispose();
            mat.map = createSignTexture(
              cfg.appName,
              `${cfg.subjectName} • ${cfg.className}`,
              '#0f172a',
              cfg.arenaTitle,
              engine.maxAnisotropy
            );
            mat.needsUpdate = true;
          }
        },
        rebuildBuildings() {
          engine.buildingEntries.forEach((b) => {
            scene.remove(b.group);
            disposeObject3D(b.group);
          });
          engine.buildingEntries = [];

          propsRef.current.materials.forEach((matItem, idx) => {
            const group = new THREE.Group();
            const px = matItem.posX !== undefined ? matItem.posX : (idx % 2 === 0 ? -1 : 1) * 22;
            const pz = matItem.posZ !== undefined ? matItem.posZ : -6 + Math.floor(idx / 2) * 18;
            group.position.set(px, 0, pz);

            // Body, Roof, Door Portal, Yellow Pad, Billboard
            group.add(createVoxelBox(9.5, 6.5, 8.5, '#ffffff', 0, 3.25, 0, true, 0.72, 0.05));
            group.add(createVoxelBox(10.5, 1.4, 9.5, matItem.warna || '#2563EB', 0, 7.1, 0, true, 0.45, 0.15));

            const portal = new THREE.Mesh(
              new THREE.BoxGeometry(2.8, 3.6, 0.4),
              new THREE.MeshStandardMaterial({
                color: matItem.warna || '#2563EB',
                emissive: matItem.warna || '#2563EB',
                emissiveIntensity: 0.45,
                roughness: 0.25,
              })
            );
            portal.position.set(0, 1.8, 4.35);
            group.add(portal);

            const pad = new THREE.Mesh(
              new THREE.BoxGeometry(4.2, 0.25, 3.2),
              new THREE.MeshStandardMaterial({
                color: '#facc15',
                emissive: '#eab308',
                emissiveIntensity: 0.25,
                roughness: 0.35,
              })
            );
            pad.position.set(0, 0.14, 6.2);
            pad.receiveShadow = true;
            group.add(pad);

            const verifLabel =
              matItem.statusVerifikasi === 'TERVERIFIKASI_SUMBER' || matItem.statusVerifikasi === 'IMPOR_GURU'
                ? 'TERVERIFIKASI'
                : 'PERLU VERIFIKASI GURU';
            const billboardTex = createSignTexture(
              matItem.namaGedung,
              matItem.bab,
              matItem.warna || '#1e293b',
              verifLabel,
              engine.maxAnisotropy
            );
            const billboard = new THREE.Mesh(
              new THREE.BoxGeometry(8.8, 2.8, 0.4),
              new THREE.MeshBasicMaterial({ map: billboardTex })
            );
            billboard.position.set(0, 9.6, 0);
            group.add(billboard);

            scene.add(group);
            engine.buildingEntries.push({
              id: matItem.id,
              group,
              portalPadPos: new THREE.Vector3(px, 0, pz + 6.2),
              centerPos: new THREE.Vector3(px, 0, pz),
            });
          });
        },
        rebuildPlayers() {
          engine.playerEntries.forEach((p) => {
            scene.remove(p.group);
            disposeObject3D(p.group);
          });
          engine.playerEntries = [];
          nametagsContainer.innerHTML = '';

          const pColors = ['bg-blue-600', 'bg-pink-600', 'bg-emerald-600', 'bg-amber-500'];

          propsRef.current.players.forEach((pState, idx) => {
            const preset = AVATAR_PRESETS.find((a) => a.id === pState.avatarId) || AVATAR_PRESETS[0];
            const group = new THREE.Group();

            const leftLeg = createVoxelBox(0.55, 1.1, 0.55, preset.legs, -0.32, 0.55, 0, true, 0.78, 0.05);
            const rightLeg = createVoxelBox(0.55, 1.1, 0.55, preset.legs, 0.32, 0.55, 0, true, 0.78, 0.05);
            const torso = createVoxelBox(1.25, 1.35, 0.7, preset.torso, 0, 1.78, 0, true, 0.65, 0.08);
            const leftArm = createVoxelBox(0.45, 1.25, 0.45, preset.head, -0.9, 1.8, 0, true, 0.72, 0.04);
            const rightArm = createVoxelBox(0.45, 1.25, 0.45, preset.head, 0.9, 1.8, 0, true, 0.72, 0.04);
            const head = createVoxelBox(1.15, 1.15, 1.15, preset.head, 0, 3.05, 0, true, 0.7, 0.04);

            const eyeL = createVoxelBox(0.16, 0.22, 0.1, '#0f172a', -0.25, 3.12, 0.58, false, 0.3, 0.2);
            const eyeR = createVoxelBox(0.16, 0.22, 0.1, '#0f172a', 0.25, 3.12, 0.58, false, 0.3, 0.2);
            group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head, eyeL, eyeR);

            // Grounded contact shadow disc beneath player feet
            const shadowDisc = new THREE.Mesh(
              new THREE.CircleGeometry(0.85, 16),
              new THREE.MeshBasicMaterial({
                color: '#0f172a',
                transparent: true,
                opacity: 0.28,
                depthWrite: false,
              })
            );
            shadowDisc.rotation.x = -Math.PI / 2;
            shadowDisc.position.y = 0.03;
            group.add(shadowDisc);

            if (preset.hat === 'crown') {
              group.add(createVoxelBox(1.2, 0.4, 1.2, '#facc15', 0, 3.78, 0, true, 0.25, 0.85));
            } else if (preset.hat === 'cat') {
              group.add(createVoxelBox(0.35, 0.45, 0.3, '#f472b6', -0.38, 3.8, 0, true, 0.65, 0.05));
              group.add(createVoxelBox(0.35, 0.45, 0.3, '#f472b6', 0.38, 3.8, 0, true, 0.65, 0.05));
            } else if (preset.hat === 'star') {
              group.add(createVoxelBox(1.22, 0.32, 0.2, '#38bdf8', 0, 3.15, 0.56, false, 0.15, 0.6));
            } else if (preset.hat === 'knight') {
              group.add(createVoxelBox(1.25, 0.5, 1.25, '#059669', 0, 3.75, 0, true, 0.28, 0.78));
            } else if (preset.hat === 'wizard') {
              const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.8, 1.3, 4),
                new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.55 })
              );
              cone.position.set(0, 4.2, 0);
              group.add(cone);
            }

            // Shop accessories
            if (pState.equippedItem === 'hat_beret') {
              group.add(createVoxelBox(1.3, 0.3, 1.3, '#ef4444', 0.1, 3.75, 0, true, 0.75));
            } else if (pState.equippedItem === 'acc_vr') {
              group.add(createVoxelBox(1.25, 0.38, 0.25, '#06b6d4', 0, 3.12, 0.58, false, 0.15, 0.7));
            } else if (pState.equippedItem === 'acc_aura') {
              group.add(createVoxelBox(1.35, 0.45, 1.35, '#fde047', 0, 3.85, 0, true, 0.2, 0.9));
            } else if (pState.equippedItem === 'acc_camera') {
              group.add(createVoxelBox(0.75, 0.5, 0.45, '#facc15', 0, 1.75, 0.52, true, 0.25, 0.85));
            }

            group.position.set(pState.x, pState.y, pState.z);
            group.visible = pState.active;
            scene.add(group);

            const tagEl = document.createElement('div');
            tagEl.className = 'player-nametag';
            tagEl.innerHTML = `<span class="px-2 py-0.5 rounded-full ${pColors[idx]} text-white font-display font-bold text-[11px] shadow border border-white">${pState.id} · ${pState.name.replace(/</g, '&lt;')}</span>`;
            tagEl.style.display = pState.active ? 'block' : 'none';
            nametagsContainer.appendChild(tagEl);

            engine.playerEntries.push({ group, leftLeg, rightLeg, leftArm, rightArm, tagEl });
          });
        },
      };

      engineRef.current = engine;
      engine.rebuildBuildings();
      engine.rebuildPlayers();

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Pointer drag orbit & wheel zoom + keyboard listeners
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        engine.cameraTargetOrbit -= dx * 0.007;
        engine.cameraPitchAngle = Math.max(0.22, Math.min(1.15, engine.cameraPitchAngle + dy * 0.005));
      };
      const onPointerUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        engine.cameraTargetDistance = Math.max(
          14,
          Math.min(58, engine.cameraTargetDistance + e.deltaY * 0.01)
        );
      };
      const onKeyDown = (e: KeyboardEvent) => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        engine.keysDown[e.code] = true;

        if (e.code === 'Space') {
          e.preventDefault();
          const p = propsRef.current.players[0];
          if (p && p.active && p.y <= 0.05) {
            p.vy = 0.28;
            SoundFX.jump();
          }
        }
        if (e.code === 'Enter' || e.code === 'ShiftRight') {
          const p = propsRef.current.players[1];
          if (p && p.active && p.y <= 0.05) {
            p.vy = 0.28;
            SoundFX.jump();
          }
        }
        if (e.code === 'KeyU' || e.code === 'KeyO') {
          const p = propsRef.current.players[2];
          if (p && p.active && p.y <= 0.05) {
            p.vy = 0.28;
            SoundFX.jump();
          }
        }
        if (e.code === 'KeyR' || e.code === 'KeyY') {
          const p = propsRef.current.players[3];
          if (p && p.active && p.y <= 0.05) {
            p.vy = 0.28;
            SoundFX.jump();
          }
        }

        if (propsRef.current.isQuizActive && propsRef.current.onQuizShortcutKey) {
          propsRef.current.onQuizShortcutKey(e.code);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        engine.keysDown[e.code] = false;
      };
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      const onContextLost = (e: Event) => {
        e.preventDefault();
      };

      const domEl = renderer.domElement;
      domEl.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      domEl.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('resize', onResize);
      domEl.addEventListener('webglcontextlost', onContextLost);

      // Animation loop using THREE.Clock + afterDraw pacing on Software WebGL
      const clock = new THREE.Clock();
      let frameId = 0;
      let disposed = false;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const tick = () => {
        if (disposed) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.getElapsedTime();

        // Clouds & monument animation
        cloudsGroup.children.forEach((c, i) => {
          c.position.x += (0.8 + i * 0.15) * dt;
          if (c.position.x > 44) c.position.x = -44;
        });
        centralCrystal.rotation.y += 1.2 * dt;
        centralCrystal.position.y = 4.35 + Math.sin(elapsed * 3) * 0.28;
        fountainWater.scale.y = 0.85 + Math.sin(elapsed * 8) * 0.25;

        if (propsRef.current.isStartScreen) {
          engine.cameraTargetOrbit += 0.18 * dt;
        }

        // Smooth camera damping
        engine.cameraOrbitAngle = THREE.MathUtils.damp(
          engine.cameraOrbitAngle,
          engine.cameraTargetOrbit,
          8,
          dt
        );
        engine.cameraDistance = THREE.MathUtils.damp(
          engine.cameraDistance,
          engine.cameraTargetDistance,
          8,
          dt
        );

        // Update players movement
        const moveSpeed = 11.5;
        const curPlayers = propsRef.current.players;
        const touchIdx = propsRef.current.activeTouchPlayerIndex;
        const autoMove = propsRef.current.isAutoMove;

        curPlayers.forEach((p, idx) => {
          const entry = engine.playerEntries[idx];
          if (!p.active || !entry) return;
          let vx = 0;
          let vz = 0;

          if (idx === 0) {
            if (engine.keysDown['KeyW']) vz -= 1;
            if (engine.keysDown['KeyS']) vz += 1;
            if (engine.keysDown['KeyA']) vx -= 1;
            if (engine.keysDown['KeyD']) vx += 1;
          } else if (idx === 1) {
            if (engine.keysDown['ArrowUp']) vz -= 1;
            if (engine.keysDown['ArrowDown']) vz += 1;
            if (engine.keysDown['ArrowLeft']) vx -= 1;
            if (engine.keysDown['ArrowRight']) vx += 1;
          } else if (idx === 2) {
            if (engine.keysDown['KeyI']) vz -= 1;
            if (engine.keysDown['KeyK']) vz += 1;
            if (engine.keysDown['KeyJ']) vx -= 1;
            if (engine.keysDown['KeyL']) vx += 1;
          } else if (idx === 3) {
            if (engine.keysDown['KeyT']) vz -= 1;
            if (engine.keysDown['KeyG']) vz += 1;
            if (engine.keysDown['KeyF']) vx -= 1;
            if (engine.keysDown['KeyH']) vx += 1;
          }

          if (idx === touchIdx) {
            if (engine.virtualPad.up) vz -= 1;
            if (engine.virtualPad.down) vz += 1;
            if (engine.virtualPad.left) vx -= 1;
            if (engine.virtualPad.right) vx += 1;
          }

          if (autoMove && vx === 0 && vz === 0) {
            const t = elapsed * 0.6 + idx * 1.5;
            const tx = Math.cos(t) * (10 + idx * 2.5);
            const tz = Math.sin(t) * (10 + idx * 2.5);
            const dx = tx - p.x;
            const dz = tz - p.z;
            if (Math.hypot(dx, dz) > 0.5) {
              vx = dx;
              vz = dz;
            }
          }

          const len = Math.hypot(vx, vz);
          if (len > 0.01) {
            vx /= len;
            vz /= len;
            const sin = Math.sin(engine.cameraOrbitAngle);
            const cos = Math.cos(engine.cameraOrbitAngle);
            const worldVx = vx * cos + vz * sin;
            const worldVz = -vx * sin + vz * cos;

            p.x = Math.max(-34, Math.min(34, p.x + worldVx * moveSpeed * dt));
            p.z = Math.max(-34, Math.min(34, p.z + worldVz * moveSpeed * dt));
            p.rotY = Math.atan2(worldVx, worldVz);
            p.walkPhase += 12 * dt;

            const swing = Math.sin(p.walkPhase) * 0.55;
            entry.leftLeg.rotation.x = swing;
            entry.rightLeg.rotation.x = -swing;
            entry.leftArm.rotation.x = -swing;
            entry.rightArm.rotation.x = swing;
          } else {
            entry.leftLeg.rotation.x = 0;
            entry.rightLeg.rotation.x = 0;
            entry.leftArm.rotation.x = 0;
            entry.rightArm.rotation.x = 0;
          }

          if (p.y > 0 || p.vy > 0) {
            p.y += p.vy;
            p.vy -= 0.95 * dt;
            if (p.y <= 0) {
              p.y = 0;
              p.vy = 0;
            }
          }

          entry.group.position.set(p.x, p.y, p.z);
          entry.group.rotation.y = p.rotY;
        });

        // Smooth camera target follow
        if (engine.cameraFocusMode === 0 && curPlayers[0]) {
          _targetPos.set(curPlayers[0].x, curPlayers[0].y + 2, curPlayers[0].z);
        } else if (engine.cameraFocusMode === 1) {
          _targetPos.set(0, 3, 0);
        } else if (engine.buildingEntries[engine.cameraFocusMode - 2]) {
          const b = engine.buildingEntries[engine.cameraFocusMode - 2];
          _targetPos.set(b.centerPos.x, 3, b.centerPos.z);
        } else {
          _targetPos.set(0, 2, 0);
        }

        _smoothedTarget.x = THREE.MathUtils.damp(_smoothedTarget.x, _targetPos.x, 10, dt);
        _smoothedTarget.y = THREE.MathUtils.damp(_smoothedTarget.y, _targetPos.y, 10, dt);
        _smoothedTarget.z = THREE.MathUtils.damp(_smoothedTarget.z, _targetPos.z, 10, dt);

        const horizDist = Math.cos(engine.cameraPitchAngle) * engine.cameraDistance;
        const vertDist = Math.sin(engine.cameraPitchAngle) * engine.cameraDistance;
        camera.position.set(
          _smoothedTarget.x + Math.sin(engine.cameraOrbitAngle) * horizDist,
          _smoothedTarget.y + vertDist,
          _smoothedTarget.z + Math.cos(engine.cameraOrbitAngle) * horizDist
        );
        camera.lookAt(_smoothedTarget);

        // Project 2D player nametags
        curPlayers.forEach((p, idx) => {
          const entry = engine.playerEntries[idx];
          if (!entry) return;
          if (!p.active) {
            entry.tagEl.style.display = 'none';
            return;
          }
          _headPos.set(p.x, p.y + 4.4, p.z);
          _headPos.project(camera);
          if (_headPos.z > 1) {
            entry.tagEl.style.display = 'none';
          } else {
            entry.tagEl.style.display = 'block';
            const sx = (_headPos.x * 0.5 + 0.5) * window.innerWidth;
            const sy = (-_headPos.y * 0.5 + 0.5) * window.innerHeight;
            entry.tagEl.style.left = `${sx}px`;
            entry.tagEl.style.top = `${sy}px`;
          }
        });

        // Proximity detection to building pads
        if (!propsRef.current.isStartScreen) {
          let foundId: string | null = null;
          for (const b of engine.buildingEntries) {
            for (const p of curPlayers) {
              if (!p.active) continue;
              if (Math.hypot(p.x - b.portalPadPos.x, p.z - b.portalPadPos.z) < 3.4) {
                foundId = b.id;
                break;
              }
            }
            if (foundId) break;
          }
          if (foundId !== engine.lastNearbyId) {
            engine.lastNearbyId = foundId;
            propsRef.current.onProximityChange(foundId);
          }
        }

        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      if (isSoftwareGl) {
        frameId = window.setTimeout(tick, 16);
      } else {
        frameId = requestAnimationFrame(tick);
      }

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        domEl.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        domEl.removeEventListener('wheel', onWheel);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        domEl.removeEventListener('webglcontextlost', onContextLost);
        disposeObject3D(scene);
        envTex.dispose();
        renderer.dispose();
        engineRef.current = null;
      };
    }, []);

    // Rebuild buildings when materials change
    useEffect(() => {
      engineRef.current?.rebuildBuildings();
    }, [materials]);

    // Rebuild players when players configuration/avatar/accessories change
    useEffect(() => {
      engineRef.current?.rebuildPlayers();
    }, [players]);

    // Update monument sign when appConfig changes
    useEffect(() => {
      engineRef.current?.updateMonumentSign();
    }, [appConfig]);

    return (
      <>
        <div ref={mountRef} className="fixed inset-0 w-full h-full z-[1]">
          {webglUnavailable && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-200 p-6">
              <div className="surface-panel rounded-3xl p-6 max-w-md text-center shadow-xl">
                <h2 className="font-display font-bold text-xl text-slate-900">
                  Mode Pembelajaran 2D Aktif
                </h2>
                <p className="text-sm text-slate-700 mt-2">
                  Perangkat membatasi akselerasi WebGL 3D. Seluruh gedung materi, kuis, panel guru,
                  dan rekap nilai tetap dapat digunakan sepenuhnya melalui menu di atas.
                </p>
              </div>
            </div>
          )}
        </div>
        <div ref={nametagsRef} className="fixed inset-0 pointer-events-none z-10" />
      </>
    );
  }
);
