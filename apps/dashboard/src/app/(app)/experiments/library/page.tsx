"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    FiPlay, FiPause, FiSquare, FiRefreshCw, FiSkipForward, FiRewind, FiFastForward, FiCircle, FiRepeat, FiShuffle,
    FiFlag, FiTarget, FiMapPin, FiAnchor, FiBookmark,
    FiDatabase, FiServer, FiCloud, FiHardDrive, FiFolder, FiFile, FiFileText, FiCode, FiTerminal, FiMonitor,
    FiLink, FiLink2, FiWifi, FiBluetooth, FiRadio,
    FiCpu, FiActivity, FiDisc, FiGlobe,
    FiUser, FiUsers, FiBriefcase, FiBox, FiZap,
    FiMail, FiMessageSquare, FiMessageCircle, FiBell, FiAlertTriangle, FiAlertCircle, FiXCircle, FiCheckCircle, FiInfo,
    FiClock, FiWatch, FiCalendar, FiSun,
    FiFilter, FiList, FiSearch, FiZoomIn, FiCamera, FiBarChart2, FiTrendingUp, FiPieChart,
    FiLock, FiUnlock, FiKey, FiShield, FiEye, FiEyeOff,
} from "react-icons/fi";
import { IconType } from "react-icons";

// Icon library using react-icons for proper rendering
const ICON_CATEGORIES = [
    {
        name: "Playback",
        icons: [
            { name: "Play", icon: FiPlay },
            { name: "Pause", icon: FiPause },
            { name: "Stop", icon: FiSquare },
            { name: "Restart", icon: FiRefreshCw },
            { name: "Skip", icon: FiSkipForward },
            { name: "Rewind", icon: FiRewind },
            { name: "Forward", icon: FiFastForward },
            { name: "Record", icon: FiCircle },
            { name: "Loop", icon: FiRepeat },
            { name: "Shuffle", icon: FiShuffle },
        ]
    },
    {
        name: "Markers",
        icons: [
            { name: "Flag", icon: FiFlag },
            { name: "Target", icon: FiTarget },
            { name: "Pin", icon: FiMapPin },
            { name: "Anchor", icon: FiAnchor },
            { name: "Bookmark", icon: FiBookmark },
        ]
    },
    {
        name: "Data & Storage",
        icons: [
            { name: "Database", icon: FiDatabase },
            { name: "Server", icon: FiServer },
            { name: "Cloud", icon: FiCloud },
            { name: "Storage", icon: FiHardDrive },
            { name: "Folder", icon: FiFolder },
            { name: "File", icon: FiFile },
            { name: "Document", icon: FiFileText },
            { name: "Code", icon: FiCode },
            { name: "Terminal", icon: FiTerminal },
            { name: "Console", icon: FiMonitor },
        ]
    },
    {
        name: "Connectivity",
        icons: [
            { name: "Link", icon: FiLink },
            { name: "Chain", icon: FiLink2 },
            { name: "Wifi", icon: FiWifi },
            { name: "Bluetooth", icon: FiBluetooth },
            { name: "Signal", icon: FiRadio },
        ]
    },
    {
        name: "Processing",
        icons: [
            { name: "CPU", icon: FiCpu },
            { name: "Activity", icon: FiActivity },
            { name: "Disk", icon: FiDisc },
            { name: "Network", icon: FiGlobe },
        ]
    },
    {
        name: "Users",
        icons: [
            { name: "User", icon: FiUser },
            { name: "Users", icon: FiUsers },
            { name: "Team", icon: FiBriefcase },
            { name: "Bot", icon: FiBox },
            { name: "AI", icon: FiZap },
        ]
    },
    {
        name: "Notifications",
        icons: [
            { name: "Email", icon: FiMail },
            { name: "Message", icon: FiMessageSquare },
            { name: "Chat", icon: FiMessageCircle },
            { name: "Bell", icon: FiBell },
            { name: "Alert", icon: FiAlertTriangle },
            { name: "Warning", icon: FiAlertCircle },
            { name: "Error", icon: FiXCircle },
            { name: "Success", icon: FiCheckCircle },
            { name: "Info", icon: FiInfo },
        ]
    },
    {
        name: "Time",
        icons: [
            { name: "Clock", icon: FiClock },
            { name: "Timer", icon: FiWatch },
            { name: "Calendar", icon: FiCalendar },
            { name: "Schedule", icon: FiSun },
        ]
    },
    {
        name: "Analysis",
        icons: [
            { name: "Filter", icon: FiFilter },
            { name: "Sort", icon: FiList },
            { name: "Search", icon: FiSearch },
            { name: "Zoom", icon: FiZoomIn },
            { name: "Scan", icon: FiCamera },
            { name: "Chart", icon: FiBarChart2 },
            { name: "Trend", icon: FiTrendingUp },
            { name: "Stats", icon: FiPieChart },
        ]
    },
    {
        name: "Security",
        icons: [
            { name: "Lock", icon: FiLock },
            { name: "Unlock", icon: FiUnlock },
            { name: "Key", icon: FiKey },
            { name: "Shield", icon: FiShield },
            { name: "Visible", icon: FiEye },
            { name: "Hidden", icon: FiEyeOff },
        ]
    },
];

// Color presets
const COLOR_PRESETS = [
    { name: "White", color: "#ffffff" },
    { name: "Blue", color: "#60a5fa" },
    { name: "Green", color: "#10b981" },
    { name: "Purple", color: "#a78bfa" },
    { name: "Pink", color: "#ec4899" },
    { name: "Orange", color: "#f97316" },
    { name: "Cyan", color: "#22d3ee" },
    { name: "Yellow", color: "#fbbf24" },
];

export default function LibraryPage() {
    const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[1]);
    const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
    const [filter, setFilter] = useState("");

    const totalIcons = ICON_CATEGORIES.reduce((sum, cat) => sum + cat.icons.length, 0);

    return (
        <main className="min-h-screen p-6 bg-gray-950">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto"
            >
                <h1 className="text-2xl font-bold mb-1 text-center text-white">
                    Icon Library
                </h1>
                <p className="text-gray-400 text-center mb-6 text-sm">
                    {totalIcons} workflow icons with dynamic coloring
                </p>

                {/* Search and Color Controls */}
                <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search icons..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="flex-1 min-w-[200px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => setSelectedColor(preset)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${selectedColor.name === preset.name
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                    }`}
                            >
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: preset.color }}
                                />
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hovered icon display */}
                {hoveredIcon && (
                    <div className="text-center mb-4">
                        <span className="text-sm text-gray-400">Icon: </span>
                        <span className="text-sm text-white font-medium">{hoveredIcon}</span>
                    </div>
                )}

                {/* Icon Categories */}
                <div className="space-y-6">
                    {ICON_CATEGORIES.map((category) => {
                        const filteredIcons = category.icons.filter(
                            icon => !filter || icon.name.toLowerCase().includes(filter.toLowerCase())
                        );

                        if (filteredIcons.length === 0) return null;

                        return (
                            <div key={category.name} className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                                <h3 className="text-white font-medium mb-3 text-sm">{category.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {filteredIcons.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <motion.div
                                                key={item.name}
                                                whileHover={{ scale: 1.1 }}
                                                onMouseEnter={() => setHoveredIcon(item.name)}
                                                onMouseLeave={() => setHoveredIcon(null)}
                                                className="w-12 h-12 flex items-center justify-center bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
                                                title={item.name}
                                            >
                                                <Icon size={20} color={selectedColor.color} />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* AI Generated spritesheet */}
                <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <h3 className="text-white font-medium mb-2 text-sm">AI Generated Icon Set (Reference)</h3>
                    <p className="text-gray-500 text-xs mb-3">100 workflow icons spritesheet</p>
                    <img
                        src="/icons/monotone_icons.png"
                        alt="AI Generated Icons"
                        className="w-full max-w-md rounded-lg border border-gray-700 mx-auto"
                    />
                </div>
            </motion.div>
        </main>
    );
}
