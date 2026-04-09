"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { navDirection } from "@/lib/navDirection";

const SLIDE_DISTANCE = 40; // px

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  // Capture direction at the moment this page mounts so it stays stable.
  const direction = useRef(navDirection.value).current;

  // On desktop: sidebar is vertical → slide on Y axis.
  // Positive direction = navigating downward in the list → new page enters from below.
  // Negative direction = navigating upward → new page enters from above.
  const y = direction === 0 ? 12 : direction * SLIDE_DISTANCE;

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-1 flex flex-col min-h-0"
    >
      {children}
    </motion.div>
  );
}
