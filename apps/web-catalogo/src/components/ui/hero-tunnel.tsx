"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1558171813-4c088753af8f?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1543076499-a6133cb932fd?q=80&w=600&fit=crop",
  "https://images.unsplash.com/photo-1467043237213-65f2da53396f?q=80&w=600&fit=crop",
];

// Global texture cache to avoid redundant HTTP requests and memory leaks
const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

function getCachedTexture(url: string, onLoad?: (tex: THREE.Texture) => void): THREE.Texture {
  if (textureCache.has(url)) {
    const cached = textureCache.get(url)!;
    if (onLoad) onLoad(cached);
    return cached;
  }
  const tex = textureLoader.load(url, (loadedTex) => {
    loadedTex.minFilter = THREE.LinearFilter;
    loadedTex.generateMipmaps = false;
    if (onLoad) onLoad(loadedTex);
  });
  textureCache.set(url, tex);
  return tex;
}

const TUNNEL_WIDTH = 24;
const TUNNEL_HEIGHT = 16;
const SEGMENT_DEPTH = 6;

interface HeroTunnelProps {
  isDarkMode?: boolean;
  customImages?: string[];
  children?: React.ReactNode;
  className?: string;
}

export function HeroTunnel({
  isDarkMode = true,
  customImages = DEFAULT_IMAGES,
  children,
  className,
}: HeroTunnelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const segmentsRef = useRef<THREE.Group[]>([]);
  const scrollPosRef = useRef(0);
  const [imageUrls, setImageUrls] = useState(customImages);

  const populateImages = useCallback(
    (
      group: THREE.Group,
      w: number,
      h: number,
      d: number,
      cols: number,
      rows: number,
      pool: string[] = imageUrls
    ) => {
      const cellMargin = 0.4;
      const activePool = pool.length > 0 ? pool : imageUrls;
      const colWidth = (w * 2) / cols;
      const rowHeight = (h * 2) / rows;

      const addImg = (
        pos: THREE.Vector3,
        rot: THREE.Euler,
        wd: number,
        ht: number
      ) => {
        const url = activePool[Math.floor(Math.random() * activePool.length)];
        const geom = new THREE.PlaneGeometry(wd - cellMargin, ht - cellMargin);
        const tex = getCachedTexture(url);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        });

        const m = new THREE.Mesh(geom, mat);
        m.position.copy(pos);
        m.rotation.copy(rot);
        m.name = "slab_image";
        group.add(m);
      };

      // Floor
      let lastFloorIdx = -999;
      for (let i = 0; i < cols; i++) {
        if (i > lastFloorIdx + 1 && Math.random() > 0.75) {
          addImg(
            new THREE.Vector3(-w + i * colWidth + colWidth / 2, -h, -d / 2),
            new THREE.Euler(-Math.PI / 2, 0, 0),
            colWidth,
            d
          );
          lastFloorIdx = i;
        }
      }

      // Ceiling
      let lastCeilIdx = -999;
      for (let i = 0; i < cols; i++) {
        if (i > lastCeilIdx + 1 && Math.random() > 0.85) {
          addImg(
            new THREE.Vector3(-w + i * colWidth + colWidth / 2, h, -d / 2),
            new THREE.Euler(Math.PI / 2, 0, 0),
            colWidth,
            d
          );
          lastCeilIdx = i;
        }
      }

      // Left wall
      let lastLeftIdx = -999;
      for (let i = 0; i < rows; i++) {
        if (i > lastLeftIdx + 1 && Math.random() > 0.75) {
          addImg(
            new THREE.Vector3(
              -w,
              -h + i * rowHeight + rowHeight / 2,
              -d / 2
            ),
            new THREE.Euler(0, Math.PI / 2, 0),
            d,
            rowHeight
          );
          lastLeftIdx = i;
        }
      }

      // Right wall
      let lastRightIdx = -999;
      for (let i = 0; i < rows; i++) {
        if (i > lastRightIdx + 1 && Math.random() > 0.75) {
          addImg(
            new THREE.Vector3(
              w,
              -h + i * rowHeight + rowHeight / 2,
              -d / 2
            ),
            new THREE.Euler(0, -Math.PI / 2, 0),
            d,
            rowHeight
          );
          lastRightIdx = i;
        }
      }
    },
    [imageUrls]
  );

  const removeSlabImages = (segment: THREE.Group) => {
    const toRemove: THREE.Object3D[] = [];
    segment.traverse((c) => {
      if (c.name === "slab_image") toRemove.push(c);
    });
    toRemove.forEach((c) => {
      segment.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        c.material.dispose();
      }
    });
  };

  // Main Three.js setup
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const isMobile = window.innerWidth < 768;
    const numSegments = isMobile ? 6 : 8; // Optimized segment count for fast rendering
    const floorCols = isMobile ? 4 : 6;
    const wallRows = isMobile ? 3 : 4;
    const colWidth = TUNNEL_WIDTH / floorCols;
    const rowHeight = TUNNEL_HEIGHT / wallRows;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x050505 : 0xC7D6E1);
    scene.fog = new THREE.FogExp2(isDarkMode ? 0x050505 : 0xC7D6E1, 0.038);
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 500);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    rendererRef.current = renderer;

    // Create tunnel segments
    const createSegment = (zPos: number) => {
      const group = new THREE.Group();
      group.position.z = zPos;
      const w = TUNNEL_WIDTH / 2;
      const h = TUNNEL_HEIGHT / 2;
      const d = SEGMENT_DEPTH;

      const lineMaterial = new THREE.LineBasicMaterial({
        color: isDarkMode ? 0x555555 : 0x8B95A0,
        transparent: true,
        opacity: isDarkMode ? 0.35 : 0.3,
      });

      const lineGeo = new THREE.BufferGeometry();
      const vertices: number[] = [];

      for (let i = 0; i <= floorCols; i++) {
        const x = -w + i * colWidth;
        vertices.push(x, -h, 0, x, -h, -d);
        vertices.push(x, h, 0, x, h, -d);
      }
      for (let i = 1; i < wallRows; i++) {
        const y = -h + i * rowHeight;
        vertices.push(-w, y, 0, -w, y, -d);
        vertices.push(w, y, 0, w, y, -d);
      }
      vertices.push(-w, -h, 0, w, -h, 0);
      vertices.push(-w, h, 0, w, h, 0);
      vertices.push(-w, -h, 0, -w, h, 0);
      vertices.push(w, -h, 0, w, h, 0);

      lineGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      const lines = new THREE.LineSegments(lineGeo, lineMaterial);
      group.add(lines);

      populateImages(group, w, h, d, floorCols, wallRows);
      return group;
    };

    const segments: THREE.Group[] = [];
    for (let i = 0; i < numSegments; i++) {
      const z = -i * SEGMENT_DEPTH;
      const segment = createSegment(z);
      scene.add(segment);
      segments.push(segment);
    }
    segmentsRef.current = segments;

    // Initial render immediately
    renderer.render(scene, camera);

    // Animation loop
    let frameId: number;
    let isVisible = true;

    const animate = () => {
      if (!isVisible) return;
      frameId = requestAnimationFrame(animate);
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;

      const targetZ = -scrollPosRef.current * 0.05;
      const currentZ = cameraRef.current.position.z;
      cameraRef.current.position.z += (targetZ - currentZ) * 0.1;

      const tunnelLength = numSegments * SEGMENT_DEPTH;
      const camZ = cameraRef.current.position.z;

      segmentsRef.current.forEach((segment) => {
        if (segment.position.z > camZ + SEGMENT_DEPTH) {
          let minZ = 0;
          segmentsRef.current.forEach((s) => (minZ = Math.min(minZ, s.position.z)));
          segment.position.z = minZ - SEGMENT_DEPTH;
          removeSlabImages(segment);
          populateImages(
            segment,
            TUNNEL_WIDTH / 2,
            TUNNEL_HEIGHT / 2,
            SEGMENT_DEPTH,
            floorCols,
            wallRows
          );
        }
        if (segment.position.z < camZ - tunnelLength - SEGMENT_DEPTH) {
          let maxZ = -999999;
          segmentsRef.current.forEach((s) => (maxZ = Math.max(maxZ, s.position.z)));
          segment.position.z = maxZ + SEGMENT_DEPTH;
          removeSlabImages(segment);
          populateImages(
            segment,
            TUNNEL_WIDTH / 2,
            TUNNEL_HEIGHT / 2,
            SEGMENT_DEPTH,
            floorCols,
            wallRows
          );
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    frameId = requestAnimationFrame(animate);

    // Visibility observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          cancelAnimationFrame(frameId);
          animate();
        } else {
          cancelAnimationFrame(frameId);
        }
      },
      { threshold: 0 }
    );
    observer.observe(containerRef.current);

    // Scroll
    const onScroll = () => {
      scrollPosRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [populateImages]);

  // Update colors on dark mode change
  useEffect(() => {
    if (!sceneRef.current) return;
    const bgHex = isDarkMode ? 0x050505 : 0xC7D6E1;
    const lineHex = isDarkMode ? 0x555555 : 0x8B95A0;
    const lineOp = isDarkMode ? 0.35 : 0.3;

    sceneRef.current.background = new THREE.Color(bgHex);
    if (sceneRef.current.fog) {
      (sceneRef.current.fog as THREE.FogExp2).color.setHex(bgHex);
    }

    segmentsRef.current.forEach((segment) => {
      segment.children.forEach((child) => {
        if (child instanceof THREE.LineSegments) {
          const mat = child.material as THREE.LineBasicMaterial;
          mat.color.setHex(lineHex);
          mat.opacity = lineOp;
          mat.needsUpdate = true;
        }
      });
    });
  }, [isDarkMode]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: isDarkMode ? "#050505" : "#C7D6E1",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>

      {children && (
        <div className="relative z-10 w-full h-full min-h-screen flex flex-col justify-center items-center pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
