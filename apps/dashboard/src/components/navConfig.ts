/**
 * Single source of truth for application navigation items.
 * Imported by BurgerMenu, Sidebar, and TopBar.
 */
import {
    FiActivity, FiMail, FiZap, FiUsers, FiGitBranch,
} from "react-icons/fi";
import type { IconType } from "react-icons";

export interface NavItem {
    href: string;
    label: string;
    icon: IconType;
    description: string;
}

export const NAV_ITEMS: NavItem[] = [
    { href: "/command-center", label: "CommandCenter", icon: FiActivity, description: "Agent Dashboard" },
    { href: "/messages", label: "Messages", icon: FiMail, description: "A2A Messages" },
    { href: "/experiments/main", label: "Experiments", icon: FiZap, description: "All Visualizations" },
    { href: "/orchestration", label: "Agent v1", icon: FiUsers, description: "1 worker" },
    { href: "/orchestration-v2", label: "Agent v2", icon: FiGitBranch, description: "2 workers" },
];
