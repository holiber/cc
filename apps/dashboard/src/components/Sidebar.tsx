"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FiPlay, FiBook, FiExternalLink } from "react-icons/fi";
import { useStorybookUrl } from "@/hooks/useStorybookUrl";
import { NAV_ITEMS } from "@/components/navConfig";

export default function Sidebar() {
    const pathname = usePathname();
    const storybookUrl = useStorybookUrl();

    return (
        <motion.nav
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 top-0 h-full w-48 bg-gray-900/95 border-r border-gray-700/50 p-4 z-50 backdrop-blur-sm"
        >
            {/* Logo */}
            <div className="mb-6 pb-4 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <FiPlay className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white">Command</h1>
                        <p className="text-[10px] text-gray-500">Center</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                ${isActive
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                                }
              `}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"}`} />
                            <div>
                                <div className="text-xs font-medium">{item.label}</div>
                                <div className="text-[9px] text-gray-500">{item.description}</div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Tools */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-2 px-3">Tools</div>
                <a
                    href={storybookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-gray-400 hover:text-white hover:bg-gray-800/50"
                >
                    <FiBook className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                    <div className="flex-1">
                        <div className="text-xs font-medium">Storybook</div>
                        <div className="text-[9px] text-gray-500">:6006</div>
                    </div>
                    <FiExternalLink className="w-3 h-3 text-gray-600" />
                </a>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-4 right-4 text-center">
                <div className="text-[9px] text-gray-600">
                    CommandCenter v0.1
                </div>
            </div>
        </motion.nav>
    );
}
