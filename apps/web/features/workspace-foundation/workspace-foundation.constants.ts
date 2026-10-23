import { Briefcase, Rocket, Shield, Target, Wrench, Zap } from "lucide-react";

export const PRESET_ICONS = [
  { id: "rocket", label: "Rocket", icon: Rocket },
  { id: "zap", label: "Speed", icon: Zap },
  { id: "briefcase", label: "Business", icon: Briefcase },
  { id: "target", label: "Focus", icon: Target },
  { id: "wrench", label: "Dev", icon: Wrench },
  { id: "shield", label: "Core", icon: Shield }
];

export const getWorkspaceIcon = (iconId?: string) => {
  const item = PRESET_ICONS.find((p) => p.id === iconId);
  return item ? item.icon : Rocket;
};

export const DEPARTMENTS = [
  "Software Engineering",
  "Product & UI/UX Design",
  "Startup / Product Squad",
  "Growth & Marketing",
  "Operations & Strategy"
];
