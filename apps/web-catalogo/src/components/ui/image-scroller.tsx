"use client";

import React, { useEffect, useState, useRef, useMemo, startTransition } from "react";
import { motion, useScroll } from "framer-motion";

export interface ImageScrollerItem {
  image: string | { src: string; alt?: string };
  video?: string;
  text?: string;
  tag?: string;
  subtitle?: string;
}

export interface ImageScrollerProps {
  items?: ImageScrollerItem[];
  transitionType?: "fade" | "scale" | "blur" | "zoom";
  backgroundColor?: string;
  textColor?: string;
  dockPosition?: "left" | "right" | "top" | "bottom" | "center";
  className?: string;
}

const DEFAULT_ITEMS: ImageScrollerItem[] = [
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1920&fit=crop",
    text: "Streetwear Noir",
    subtitle: "Siluetas oversize en algodón pima de 320 GSM",
    tag: "Colección 01",
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&fit=crop",
    text: "Alta Sastrería",
    subtitle: "Blazers desestructurados y cortes asimétricos",
    tag: "Colección 02",
  },
  {
    image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?q=80&w=1920&fit=crop",
    text: "Atelier Capsule",
    subtitle: "Prendas de edición limitada con tinte botánico",
    tag: "Colección 03",
  },
  {
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1920&fit=crop",
    text: "Denim Índigo Raw",
    subtitle: "Mezclilla pesada de 14oz con acabados artesanales",
    tag: "Colección 04",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1920&fit=crop",
    text: "Textiles Sostenibles",
    subtitle: "Fibras orgánicas certificadas de producción ética",
    tag: "Colección 05",
  },
];

export function ImageScroller({
  items = DEFAULT_ITEMS,
  transitionType = "fade",
  backgroundColor = "#BAC9D6",
  textColor = "#171B20",
  dockPosition = "bottom",
  className = "",
}: ImageScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const getImageSrc = (image: string | { src: string; alt?: string }) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    return image.src || "";
  };

  const validItems = useMemo(() => {
    return items.filter((item) => !!getImageSrc(item.image));
  }, [items]);

  useEffect(() => {
    const total = validItems.length;
    if (total <= 0) return;
    const next = Math.max(0, Math.min(activeIndex, total - 1));
    if (next !== activeIndex) {
      startTransition(() => setActiveIndex(next));
    }
  }, [validItems.length, activeIndex]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const totalItems = validItems.length;
      if (totalItems === 0) return;
      const newIndex = Math.min(
        Math.floor(latest * totalItems),
        totalItems - 1
      );
      startTransition(() => {
        setActiveIndex(newIndex);
      });
    });
    return () => unsubscribe();
  }, [scrollYProgress, validItems.length]);

  const scrollHeight = useMemo(() => {
    return Math.max(validItems.length * 45, 170);
  }, [validItems.length]);

  const getTransitionVariants = (index: number) => {
    const isActive = activeIndex === index;
    const isInitial = index === 0;

    switch (transitionType) {
      case "scale":
        return {
          initial: { opacity: isInitial ? 1 : 0, scale: isInitial ? 1 : 0.9 },
          animate: { opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.05 },
        };
      case "blur":
        return {
          initial: { opacity: isInitial ? 1 : 0, filter: isInitial ? "blur(0px)" : "blur(12px)" },
          animate: { opacity: isActive ? 1 : 0, filter: isActive ? "blur(0px)" : "blur(12px)" },
        };
      case "zoom":
        return {
          initial: { opacity: isInitial ? 1 : 0, scale: isInitial ? 1 : 0.8 },
          animate: { opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1 },
        };
      case "fade":
      default:
        return {
          initial: { opacity: isInitial ? 1 : 0 },
          animate: { opacity: isActive ? 1 : 0 },
        };
    }
  };

  const handleThumbnailClick = (index: number) => {
    if (typeof window !== "undefined" && containerRef.current) {
      const containerTop = containerRef.current.offsetTop;
      const sectionHeight = window.innerHeight;
      const scrollTarget = containerTop + index * sectionHeight + 10;
      window.scrollTo({ top: scrollTarget, behavior: "smooth" });
    }
  };

  // Drag logic for the bottom dock
  const handleDragStart = (e: React.MouseEvent) => {
    if (!dockRef.current || !stickyRef.current) return;
    const handleRect = dockRef.current.querySelector('[aria-label="Drag handle"]')?.getBoundingClientRect();
    if (handleRect) {
      if (
        e.clientX < handleRect.left ||
        e.clientX > handleRect.right ||
        e.clientY < handleRect.top ||
        e.clientY > handleRect.bottom
      ) {
        return;
      }
    }
    e.preventDefault();
    setIsDragging(true);
    const containerRect = stickyRef.current.getBoundingClientRect();
    const dockRect = dockRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - containerRect.left - (dockRect.left - containerRect.left),
      y: e.clientY - containerRect.top - (dockRect.top - containerRect.top),
    };
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !stickyRef.current || !dockRef.current) return;
    const containerRect = stickyRef.current.getBoundingClientRect();
    const dockRect = dockRef.current.getBoundingClientRect();
    let relX = e.clientX - containerRect.left - dragOffset.current.x;
    let relY = e.clientY - containerRect.top - dragOffset.current.y;
    relX = Math.max(16, Math.min(relX, containerRect.width - dockRect.width - 16));
    relY = Math.max(16, Math.min(relY, containerRect.height - dockRect.height - 16));
    setDrag({ x: relX, y: relY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging]);

  if (validItems.length === 0) return null;

  const isDockMoved = drag.x !== 0 || drag.y !== 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{
        minHeight: "100vh",
        height: `${scrollHeight}vh`,
        backgroundColor,
      }}
    >
      {/* Sticky Fullscreen Viewport */}
      <div
        ref={stickyRef}
        className="sticky top-0 left-0 w-full h-screen overflow-hidden"
      >
        {/* Fullscreen background images */}
        {validItems.map((item, index) => {
          const variants = getTransitionVariants(index);
          const src = getImageSrc(item.image);

          return (
            <motion.div
              key={index}
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{
                zIndex: activeIndex === index ? 1 : 0,
                pointerEvents: activeIndex === index ? "auto" : "none",
              }}
              initial={variants.initial}
              animate={variants.animate}
              transition={{ duration: 0.7, ease: "easeInOut" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={typeof item.image === "object" ? item.image.alt || item.text : item.text}
                className="w-full h-full object-cover object-center select-none"
                draggable={false}
              />
              {/* Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#BAC9D6]/80 via-transparent to-[#BAC9D6]/50" />
            </motion.div>
          );
        })}

        {/* Center Text Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          {validItems.map((item, index) => {
            const variants = getTransitionVariants(index);

            return (
              <motion.div
                key={index}
                className="absolute flex flex-col items-center justify-center max-w-3xl px-6"
                initial={variants.initial}
                animate={variants.animate}
                transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
              >
                {item.tag && (
                  <span className="mb-3 px-3.5 py-1 rounded-full bg-[#171B20]/8 backdrop-blur-md border border-[#C9CDD2]/30 text-[#171B20] text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest">
                    {item.tag}
                  </span>
                )}
                <h3
                  className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-2xl"
                  style={{ color: textColor }}
                >
                  {item.text}
                </h3>
                {item.subtitle && (
                  <p className="mt-3 text-sm sm:text-base md:text-lg text-[#8B95A0] font-medium max-w-xl drop-shadow-md">
                    {item.subtitle}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Floating Draggable Thumbnails Dock */}
        <div
          ref={dockRef}
          className="absolute z-20 pointer-events-auto select-none"
          style={
            isDockMoved
              ? { left: drag.x, top: drag.y, cursor: isDragging ? "grabbing" : "grab" }
              : dockPosition === "bottom"
              ? { bottom: 32, left: "50%", transform: "translateX(-50%)" }
              : { top: "50%", right: 32, transform: "translateY(-50%)" }
          }
          onMouseDown={handleDragStart}
        >
          {/* Drag handle */}
          <div
            aria-label="Drag handle"
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-9 h-3 rounded-full bg-[#C9CDD2]/80 border border-[#C9CDD2]/40 backdrop-blur-md flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md"
          >
            <div className="w-4 h-1 rounded-full bg-[#8B95A0]" />
          </div>

          {/* Dock Pill Body */}
          <div className="relative rounded-2xl bg-[#F4F2EE]/80 backdrop-blur-2xl border border-[#C9CDD2]/40 p-2 shadow-2xl flex items-center gap-2">
            {validItems.map((item, index) => {
              const src = getImageSrc(item.image);
              const isActive = activeIndex === index;

              return (
                <div
                  key={index}
                  onClick={() => handleThumbnailClick(index)}
                  className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group"
                  style={{
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {/* Active white ring outline */}
                  {isActive && (
                    <motion.div
                      layoutId="thumb-active-border"
                      className="absolute inset-0 rounded-xl border-2 border-[#171B20] z-10 pointer-events-none shadow-lg"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={item.text || `Thumb ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageScroller;
