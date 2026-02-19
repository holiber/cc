"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { href: "/experiments/main", label: "Main Demo" },
  { href: "/experiments/complex", label: "Complex" },
  { href: "/experiments/styles", label: "Styles" },
  { href: "/experiments/icons", label: "Icons" },
  { href: "/experiments/library", label: "Library" },
  { href: "/experiments/tech", label: "Tech Stack" },
];

export default function ExperimentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Top Tabs Navigation */}
      <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    relative px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }
                  `}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-x-0 bottom-[-9px] h-0.5 bg-blue-500"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
