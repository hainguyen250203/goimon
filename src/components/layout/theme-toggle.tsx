"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

const THEME_OPTIONS = [
  { value: "system", icon: Monitor, label: "Theo hệ thống" },
  { value: "light", icon: Sun, label: "Sáng" },
  { value: "dark", icon: Moon, label: "Tối" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "system";

  return (
    <ToggleGroup
      value={[current]}
      onValueChange={(value) => {
        const next = value[0];
        if (next) setTheme(next);
      }}
      variant="outline"
      size="sm"
      spacing={0}
    >
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
