"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { SegmentedControl } from "~/components/ui/segmented-control";

const THEME_OPTIONS = [
  { value: "system", icon: Monitor, label: "Theo hệ thống" },
  { value: "light", icon: Sun, label: "Sáng" },
  { value: "dark", icon: Moon, label: "Tối" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "system";

  return (
    <SegmentedControl
      size="sm"
      value={current}
      onValueChange={(details) => {
        if (details.value) setTheme(details.value);
      }}
      items={THEME_OPTIONS.map(({ value, icon: Icon, label }) => ({
        value,
        label: <Icon size={16} aria-label={label} />,
      }))}
    />
  );
}
