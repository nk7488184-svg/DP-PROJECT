"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  href?: string;
  onClick?: () => void;
  layoutId?: string;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  label,
  icon: Icon,
  isActive,
  href,
  onClick,
  layoutId = "sidebar-active-indicator",
}) => {
  const content = (
    <>
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 rounded-lg bg-emerald-500/10"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
      )}

      <Icon
        className={`relative z-10 h-5 w-5 transition-transform duration-300 ${
          isActive ? "scale-110" : "scale-100"
        }`}
      />
      <span className="relative z-10">{label}</span>
    </>
  );

  const className = `relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus:outline-none ${
    isActive ? "text-emerald-400" : "text-muted hover:text-foreground"
  }`;

  if (href) {
    return (
      <Link href={href} prefetch={true} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export default SidebarNavItem;
