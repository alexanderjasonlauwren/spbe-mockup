import { useEffect } from "react";
import { create } from "zustand";
import { NAV_GROUPS } from "@/layouts/nav";

const COLLAPSED_KEY = "sidebar:collapsed";
const OPEN_GROUPS_KEY = "sidebar:groups";

function readCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === "1";
}

function readOpenGroups(): string[] {
  try {
    const raw = localStorage.getItem(OPEN_GROUPS_KEY);
    if (!raw) return NAV_GROUPS.map((g) => g.label);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : NAV_GROUPS.map((g) => g.label);
  } catch {
    return NAV_GROUPS.map((g) => g.label);
  }
}

interface SidebarState {
  /** Rail mode: icons only, labels on hover. */
  collapsed: boolean;
  openGroups: string[];
  toggleCollapsed: () => void;
  toggleGroup: (label: string) => void;
  /** Used to reveal the group containing the current route. */
  ensureGroupOpen: (label: string) => void;
}

/**
 * Sidebar shape, shared so the header and layout can react to it and persisted
 * so it survives a reload — people set this once and expect it to stay.
 */
export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: typeof window === "undefined" ? false : readCollapsed(),
  openGroups: typeof window === "undefined" ? [] : readOpenGroups(),

  toggleCollapsed: () => {
    const next = !get().collapsed;
    localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    set({ collapsed: next });
  },

  toggleGroup: (label) => {
    const open = get().openGroups;
    const next = open.includes(label)
      ? open.filter((l) => l !== label)
      : [...open, label];
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
    set({ openGroups: next });
  },

  ensureGroupOpen: (label) => {
    const open = get().openGroups;
    if (open.includes(label)) return;
    const next = [...open, label];
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
    set({ openGroups: next });
  },
}));

/** ⌘B / Ctrl-B collapses the sidebar, the shortcut people already expect. */
export function useSidebarShortcut() {
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);
}

/** Keeps the group holding the active route expanded. */
export function useRevealActiveGroup(pathname: string) {
  const ensureGroupOpen = useSidebarStore((s) => s.ensureGroupOpen);
  useEffect(() => {
    const group = NAV_GROUPS.find((g) =>
      g.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)),
    );
    if (group) ensureGroupOpen(group.label);
  }, [pathname, ensureGroupOpen]);
}
