"use client";

import React, { useMemo } from "react";

interface Petal {
  id: number;
  left: number; // 0-100%
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  driftX: number; // px
  rotation: number; // deg
  opacity: number;
  scaleY: number; // to simulate elongated petal
}

interface CherryBlossomBackgroundProps {
  opacity?: number;
  className?: string;
  enablePetals?: boolean;
  petalCount?: number;
  variant?: "corner-right" | "side-left" | "floating-branches";
}

export function CherryBlossomBackground({
  opacity = 0.22,
  className = "",
  enablePetals = true,
  petalCount = 28,
  variant = "corner-right",
}: CherryBlossomBackgroundProps) {
  // Generate deterministic petals array for hydration safety
  const petals = useMemo<Petal[]>(() => {
    if (!enablePetals) return [];
    return Array.from({ length: petalCount }).map((_, i) => {
      // Deterministic pseudo-random based on index
      const seed = (i * 9301 + 49297) % 233280;
      const rnd1 = seed / 233280;
      const seed2 = (seed * 9301 + 49297) % 233280;
      const rnd2 = seed2 / 233280;
      const seed3 = (seed2 * 9301 + 49297) % 233280;
      const rnd3 = seed3 / 233280;

      return {
        id: i,
        left: Math.floor(rnd1 * 100),
        size: 2.5 + rnd2 * 4.5, // 2.5px to 7px
        duration: 12 + rnd3 * 16, // 12s to 28s slow contemplative fall
        delay: -(rnd1 * 20), // staggered start
        driftX: -40 + rnd2 * 120, // drift left or right with gentle breeze
        rotation: 180 + rnd3 * 360,
        opacity: 0.35 + rnd2 * 0.5, // 35% to 85% opacity
        scaleY: 0.55 + rnd1 * 0.45,
      };
    });
  }, [enablePetals, petalCount]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none ${className}`}
      style={{ opacity }}
    >
      {/* ── Layer 1: Ink-Wash Cherry Blossom Tree (SVG) ── */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMaxYMin meet"
        className="absolute right-0 top-0 w-full h-full object-cover max-w-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Branch Ink Gradient: deeper ink at root, softening towards tips */}
          <linearGradient id="inkTrunkGradient" x1="1" y1="0" x2="0.3" y2="0.8">
            <stop offset="0%" stopColor="#171B20" />
            <stop offset="45%" stopColor="#2B3138" />
            <stop offset="85%" stopColor="#3A3F45" />
            <stop offset="100%" stopColor="#4A525C" />
          </linearGradient>

          {/* Secondary Branch Gradient */}
          <linearGradient id="inkBranchSoft" x1="0.8" y1="0.2" x2="0.2" y2="0.9">
            <stop offset="0%" stopColor="#2B3138" />
            <stop offset="70%" stopColor="#3A3F45" />
            <stop offset="100%" stopColor="#56606D" />
          </linearGradient>

          {/* Blossom Soft Halo Glow */}
          <radialGradient id="blossomHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBFAF6" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#F4F2EE" stopOpacity="0.85" />
            <stop offset="85%" stopColor="#E9EDEF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C9CDD2" stopOpacity="0" />
          </radialGradient>

          {/* Blossom Cluster Shading Gradients */}
          <radialGradient id="clusterGrad1" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FBFAF6" />
            <stop offset="45%" stopColor="#F4F2EE" />
            <stop offset="75%" stopColor="#C9CDD2" />
            <stop offset="100%" stopColor="#8B95A0" />
          </radialGradient>

          <radialGradient id="clusterGrad2" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FBFAF6" />
            <stop offset="50%" stopColor="#F4F2EE" />
            <stop offset="80%" stopColor="#C9CDD2" />
            <stop offset="100%" stopColor="#7B8692" />
          </radialGradient>

          {/* Subtle Bark Texture Filter (sumi-e brush roughness) */}
          <filter id="inkRoughness" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* ── Sub-group: Organic Ink Trunk & Branches ── */}
        <g filter="url(#inkRoughness)">
          {/* Main Dominant Trunk: Emerging from top-right edge descending diagonally left */}
          <path
            d="M 1450, -40 
               C 1380, 40  1310, 100 1240, 160
               C 1170, 220 1100, 260 1020, 290
               C 940, 320  870, 330  800, 310
               C 740, 290  700, 250  660, 190
               C 680, 230  730, 275  810, 295
               C 890, 310  960, 295 1040, 260
               C 1120, 225 1200, 180 1280, 110
               C 1350, 50  1410, -10 1460, -60 Z"
            fill="url(#inkTrunkGradient)"
          />

          {/* Secondary Arching Branch 1 (Upper Canopy spreading leftward) */}
          <path
            d="M 1240, 160
               C 1190, 120 1120, 90  1040, 80
               C 960, 70   890, 85   820, 115
               C 750, 145  690, 190  620, 210
               C 650, 200  720, 160  790, 130
               C 860, 100  940, 85  1020, 95
               C 1100, 105 1170, 130 1220, 175 Z"
            fill="url(#inkTrunkGradient)"
          />

          {/* Secondary Arching Branch 2 (Deep reaching branch downward left) */}
          <path
            d="M 1020, 290
               C 970, 350  910, 410  840, 460
               C 770, 510  700, 545  610, 565
               C 530, 580  460, 570  390, 540
               C 440, 555  510, 560  580, 545
               C 660, 525  730, 490  800, 440
               C 870, 390  930, 335  980, 280 Z"
            fill="url(#inkTrunkGradient)"
          />

          {/* Tertiary Twig 1 (Tip of Branch 1) */}
          <path
            d="M 820, 115
               C 770, 100  710, 105  650, 125
               C 590, 145  540, 180  490, 205
               C 530, 185  580, 155  640, 138
               C 700, 120  760, 115  810, 125 Z"
            fill="url(#inkBranchSoft)"
          />

          {/* Tertiary Twig 2 (Reaching upward-left) */}
          <path
            d="M 960, 70
               C 920, 30  860, 10  790, 5
               C 730, 0   670, 15  610, 45
               C 660, 25  720, 15  780, 18
               C 840, 22  900, 42  940, 75 Z"
            fill="url(#inkBranchSoft)"
          />

          {/* Tertiary Twig 3 (Descending from Branch 2) */}
          <path
            d="M 770, 510
               C 730, 570  670, 620  600, 660
               C 540, 695  470, 715  400, 720
               C 450, 710  510, 690  570, 655
               C 630, 615  690, 565  730, 510 Z"
            fill="url(#inkBranchSoft)"
          />

          {/* Delicate End Twigs */}
          <path
            d="M 620, 210 Q 560, 230 500, 260 Q 550, 235 610, 218 Z"
            fill="url(#inkBranchSoft)"
          />
          <path
            d="M 650, 125 Q 590, 110 520, 120 Q 580, 118 640, 130 Z"
            fill="url(#inkBranchSoft)"
          />
          <path
            d="M 610, 565 Q 540, 610 470, 630 Q 530, 605 595, 570 Z"
            fill="url(#inkBranchSoft)"
          />
          <path
            d="M 390, 540 Q 330, 520 270, 535 Q 325, 525 380, 545 Z"
            fill="url(#inkBranchSoft)"
          />

          {/* Subtle Bark Hatching (Bark Texture strokes on trunk) */}
          <g stroke="#3A3F45" strokeWidth="1" strokeLinecap="round" opacity="0.45">
            <line x1="1260" y1="130" x2="1275" y2="145" />
            <line x1="1220" y1="170" x2="1235" y2="182" />
            <line x1="1150" y1="215" x2="1165" y2="228" />
            <line x1="1080" y1="255" x2="1092" y2="270" />
            <line x1="1010" y1="290" x2="1018" y2="308" />
            <line x1="880" y1="320" x2="888" y2="335" />
            <line x1="770" y1="460" x2="780" y2="475" />
            <line x1="680" y1="520" x2="690" y2="532" />
          </g>
        </g>

        {/* ── Sub-group: Multi-layered Blossom Clusters (Sumi-e Scalloped Blobs) ── */}
        <g>
          {/* Cluster A: Main Top-Right Dense Canopy */}
          <g id="cluster-A" transform="translate(1080, 20)">
            {/* Layer 1: Shadow (#8B95A0) */}
            <path
              d="M 30,50 Q 0,80 40,110 Q 20,150 70,165 Q 120,180 160,150 Q 210,170 250,130 Q 290,90 260,50 Q 280,10 230,-10 Q 180,-25 140,5 Q 90,-20 50,10 Z"
              fill="#8B95A0"
              opacity="0.35"
              transform="scale(1.08) translate(-10, -5)"
            />
            {/* Layer 2: Mid-Tone (#C9CDD2) */}
            <path
              d="M 30,50 Q 0,80 40,110 Q 20,150 70,165 Q 120,180 160,150 Q 210,170 250,130 Q 290,90 260,50 Q 280,10 230,-10 Q 180,-25 140,5 Q 90,-20 50,10 Z"
              fill="#C9CDD2"
              opacity="0.6"
              transform="scale(1.03) translate(-4, -2)"
            />
            {/* Layer 3: Highlight White (#F4F2EE / #FBFAF6) */}
            <path
              d="M 30,50 Q 0,80 40,110 Q 20,150 70,165 Q 120,180 160,150 Q 210,170 250,130 Q 290,90 260,50 Q 280,10 230,-10 Q 180,-25 140,5 Q 90,-20 50,10 Z"
              fill="url(#clusterGrad1)"
            />
          </g>

          {/* Cluster B: Central-Upper Cluster */}
          <g id="cluster-B" transform="translate(860, 40)">
            <path
              d="M 20,40 Q -10,70 30,95 Q 15,130 55,145 Q 100,160 140,130 Q 180,150 210,110 Q 240,75 220,40 Q 235,5 190,-10 Q 150,-20 115,5 Q 75,-15 40,10 Z"
              fill="#8B95A0"
              opacity="0.35"
              transform="scale(1.08) translate(-8, -4)"
            />
            <path
              d="M 20,40 Q -10,70 30,95 Q 15,130 55,145 Q 100,160 140,130 Q 180,150 210,110 Q 240,75 220,40 Q 235,5 190,-10 Q 150,-20 115,5 Q 75,-15 40,10 Z"
              fill="#C9CDD2"
              opacity="0.6"
              transform="scale(1.03) translate(-3, -2)"
            />
            <path
              d="M 20,40 Q -10,70 30,95 Q 15,130 55,145 Q 100,160 140,130 Q 180,150 210,110 Q 240,75 220,40 Q 235,5 190,-10 Q 150,-20 115,5 Q 75,-15 40,10 Z"
              fill="url(#clusterGrad2)"
            />
          </g>

          {/* Cluster C: Middle Branch Cluster (Left-leaning) */}
          <g id="cluster-C" transform="translate(680, 95)">
            <path
              d="M 25,35 Q 5,60 35,80 Q 20,110 55,120 Q 90,135 125,110 Q 160,125 185,95 Q 210,65 190,35 Q 205,5 165,-5 Q 130,-15 100,5 Q 65,-10 35,10 Z"
              fill="#8B95A0"
              opacity="0.32"
              transform="scale(1.07) translate(-6, -3)"
            />
            <path
              d="M 25,35 Q 5,60 35,80 Q 20,110 55,120 Q 90,135 125,110 Q 160,125 185,95 Q 210,65 190,35 Q 205,5 165,-5 Q 130,-15 100,5 Q 65,-10 35,10 Z"
              fill="#C9CDD2"
              opacity="0.55"
            />
            <path
              d="M 25,35 Q 5,60 35,80 Q 20,110 55,120 Q 90,135 125,110 Q 160,125 185,95 Q 210,65 190,35 Q 205,5 165,-5 Q 130,-15 100,5 Q 65,-10 35,10 Z"
              fill="url(#clusterGrad1)"
            />
          </g>

          {/* Cluster D: Main Junction Canopy */}
          <g id="cluster-D" transform="translate(920, 210)">
            <path
              d="M 25,45 Q -5,75 35,105 Q 20,140 65,155 Q 110,170 150,140 Q 195,160 230,120 Q 265,85 240,45 Q 255,10 210,-10 Q 165,-20 125,5 Q 80,-15 45,10 Z"
              fill="#8B95A0"
              opacity="0.35"
              transform="scale(1.08) translate(-8, -4)"
            />
            <path
              d="M 25,45 Q -5,75 35,105 Q 20,140 65,155 Q 110,170 150,140 Q 195,160 230,120 Q 265,85 240,45 Q 255,10 210,-10 Q 165,-20 125,5 Q 80,-15 45,10 Z"
              fill="#C9CDD2"
              opacity="0.6"
            />
            <path
              d="M 25,45 Q -5,75 35,105 Q 20,140 65,155 Q 110,170 150,140 Q 195,160 230,120 Q 265,85 240,45 Q 255,10 210,-10 Q 165,-20 125,5 Q 80,-15 45,10 Z"
              fill="url(#clusterGrad2)"
            />
          </g>

          {/* Cluster E: Lower Hanging Branch Cluster */}
          <g id="cluster-E" transform="translate(720, 390)">
            <path
              d="M 20,35 Q 0,60 30,80 Q 15,105 50,118 Q 85,130 120,108 Q 150,120 175,90 Q 200,60 180,35 Q 195,8 155,-5 Q 120,-15 95,5 Q 60,-10 30,10 Z"
              fill="#8B95A0"
              opacity="0.35"
              transform="scale(1.07) translate(-6, -3)"
            />
            <path
              d="M 20,35 Q 0,60 30,80 Q 15,105 50,118 Q 85,130 120,108 Q 150,120 175,90 Q 200,60 180,35 Q 195,8 155,-5 Q 120,-15 95,5 Q 60,-10 30,10 Z"
              fill="#C9CDD2"
              opacity="0.55"
            />
            <path
              d="M 20,35 Q 0,60 30,80 Q 15,105 50,118 Q 85,130 120,108 Q 150,120 175,90 Q 200,60 180,35 Q 195,8 155,-5 Q 120,-15 95,5 Q 60,-10 30,10 Z"
              fill="url(#clusterGrad1)"
            />
          </g>

          {/* Cluster F: Furthest Branch (Mid-Left Reaching) */}
          <g id="cluster-F" transform="translate(480, 500)">
            <path
              d="M 15,30 Q -5,50 20,68 Q 10,90 40,100 Q 70,110 100,90 Q 125,100 145,75 Q 165,50 150,30 Q 160,8 130,-5 Q 100,-12 80,5 Q 50,-8 25,8 Z"
              fill="#8B95A0"
              opacity="0.32"
              transform="scale(1.06) translate(-5, -3)"
            />
            <path
              d="M 15,30 Q -5,50 20,68 Q 10,90 40,100 Q 70,110 100,90 Q 125,100 145,75 Q 165,50 150,30 Q 160,8 130,-5 Q 100,-12 80,5 Q 50,-8 25,8 Z"
              fill="#C9CDD2"
              opacity="0.5"
            />
            <path
              d="M 15,30 Q -5,50 20,68 Q 10,90 40,100 Q 70,110 100,90 Q 125,100 145,75 Q 165,50 150,30 Q 160,8 130,-5 Q 100,-12 80,5 Q 50,-8 25,8 Z"
              fill="url(#clusterGrad2)"
            />
          </g>

          {/* Smaller Satellite Blossom Clusters & Buds */}
          {/* Top edge satellites */}
          <ellipse cx="610" cy="50" rx="38" ry="26" fill="url(#clusterGrad1)" />
          <ellipse cx="530" cy="120" rx="42" ry="28" fill="url(#clusterGrad2)" />
          <ellipse cx="480" cy="195" rx="35" ry="24" fill="url(#clusterGrad1)" />

          {/* Lower branch satellites */}
          <ellipse cx="375" cy="535" rx="36" ry="25" fill="url(#clusterGrad1)" />
          <ellipse cx="280" cy="530" rx="28" ry="18" fill="url(#clusterGrad2)" />
          <ellipse cx="410" cy="710" rx="34" ry="22" fill="url(#clusterGrad1)" />
          <ellipse cx="585" cy="650" rx="40" ry="26" fill="url(#clusterGrad2)" />

          {/* ── Sub-group: Blossom Petal Details & Stippling Dots ── */}
          {/* Petal dots surrounding clusters (simulating blossoms dissolving into air) */}
          <g fill="#F4F2EE" opacity="0.9">
            <circle cx="1060" cy="18" r="4.5" />
            <circle cx="1040" cy="42" r="3" />
            <circle cx="840" cy="35" r="4" />
            <circle cx="825" cy="65" r="2.5" />
            <circle cx="660" cy="90" r="3.5" />
            <circle cx="645" cy="115" r="2" />
            <circle cx="460" cy="180" r="3.5" />
            <circle cx="445" cy="210" r="2.5" />
            <circle cx="700" cy="380" r="4" />
            <circle cx="685" cy="410" r="2.5" />
            <circle cx="460" cy="490" r="3.5" />
            <circle cx="350" cy="525" r="3" />
            <circle cx="260" cy="520" r="2.5" />
            <circle cx="390" cy="705" r="3" />
            <circle cx="560" cy="640" r="3.5" />
          </g>

          <g fill="#C9CDD2" opacity="0.75">
            <circle cx="1075" cy="10" r="2.5" />
            <circle cx="855" cy="20" r="2" />
            <circle cx="675" cy="75" r="2.5" />
            <circle cx="475" cy="165" r="2" />
            <circle cx="715" cy="365" r="2" />
            <circle cx="475" cy="475" r="2.5" />
            <circle cx="365" cy="510" r="2" />
            <circle cx="245" cy="510" r="2" />
            <circle cx="405" cy="690" r="2" />
            <circle cx="575" cy="625" r="2" />
          </g>

          <g fill="#8B95A0" opacity="0.6">
            <circle cx="1090" cy="5" r="1.5" />
            <circle cx="870" cy="12" r="1.5" />
            <circle cx="690" cy="60" r="1.5" />
            <circle cx="490" cy="150" r="1.5" />
            <circle cx="730" cy="350" r="1.5" />
            <circle cx="490" cy="460" r="1.5" />
            <circle cx="380" cy="495" r="1.5" />
            <circle cx="230" cy="500" r="1.5" />
            <circle cx="420" cy="675" r="1.5" />
            <circle cx="590" cy="610" r="1.5" />
          </g>
        </g>
      </svg>

      {/* ── Layer 2: Floating Blossom Petals (Pure GPU CSS Animations) ── */}
      {enablePetals && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {petals.map((petal) => (
            <div
              key={petal.id}
              className="absolute rounded-full"
              style={{
                left: `${petal.left}%`,
                top: "-20px",
                width: `${petal.size}px`,
                height: `${petal.size * petal.scaleY}px`,
                backgroundColor: petal.id % 3 === 0 ? "#FBFAF6" : petal.id % 3 === 1 ? "#F4F2EE" : "#C9CDD2",
                boxShadow: "0 0 4px rgba(251, 250, 246, 0.4)",
                animation: `petalFall ${petal.duration}s cubic-bezier(0.25, 0.1, 0.25, 1) infinite`,
                animationDelay: `${petal.delay}s`,
                opacity: petal.opacity,
                // Custom CSS variables for individual trajectory
                ["--drift-x" as any]: `${petal.driftX}px`,
                ["--rot" as any]: `${petal.rotation}deg`,
                ["--petal-opacity" as any]: petal.opacity,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CherryBlossomBackground;
