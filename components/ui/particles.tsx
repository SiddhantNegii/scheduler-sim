"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface ParticlesProps {
  className?: string;
}

const Particles: React.FC<ParticlesProps> = ({
  className = "",
}) => {
  return (
    <div className={cn("fixed inset-0 -z-10", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 via-transparent to-fuchsia-500/30" />
    </div>
  );
};

export default Particles;
