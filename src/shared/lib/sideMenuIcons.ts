import type { LucideIcon } from '@lucide/vue';
import {
  Activity,
  Bookmark,
  CircleHelp,
  Gavel,
  History,
  Home,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Rss,
  Settings,
  Shield,
  Users,
} from '@lucide/vue';

const sideMenuIconMap = {
  home: Home,
  subscribe: Rss,
  megaphone: Megaphone,
  chat: MessageCircle,
  community: Users,
  gallery: LayoutGrid,
  bookmark: Bookmark,
  history: History,
  settings: Settings,
  help: CircleHelp,
  shield: Shield,
  users: Users,
  gavel: Gavel,
  pulse: Activity,
} as const satisfies Record<string, LucideIcon>;

export type SideMenuIconKey = keyof typeof sideMenuIconMap;

export const resolveSideMenuIcon = (key: string): LucideIcon => {
  const icon = sideMenuIconMap[key as SideMenuIconKey];
  return icon ?? CircleHelp;
};
