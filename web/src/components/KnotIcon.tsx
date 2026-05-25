import {
  Heart,
  Gift,
  PartyPopper,
  Star,
  Sparkles,
  Cake,
  CalendarDays,
  HeartHandshake,
  Gem,
  Music,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  heart: Heart,
  gift: Gift,
  party: PartyPopper,
  star: Star,
  sparkles: Sparkles,
  cake: Cake,
  calendar: CalendarDays,
  handshake: HeartHandshake,
  gem: Gem,
  music: Music,
};

export const EVENT_ICON_NAMES = Object.keys(ICON_MAP);
export const DEFAULT_EVENT_ICON = "heart";

export function getEventIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Heart;
}

export default function KnotIcon({
  name,
  className = "w-5 h-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = getEventIcon(name);
  return <Icon className={className} />;
}
