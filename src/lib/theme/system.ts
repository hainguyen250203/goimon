import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Bo góc toàn app chỉnh TẠI ĐÂY qua 3 semantic level l1/l2/l3 — theo đúng yêu
// cầu "bo nhẹ thôi, không bo quá". Default Chakra: l1 → xs (2px) · l2 → sm
// (4px) · l3 → md (6px). Ở đây bump nhẹ 1-2 bậc để control không bị vuông
// gắt, nhưng vẫn dừng ở md/lg/xl — không đụng tới 2xl/full cho container.
const config = defineConfig({
  theme: {
    semanticTokens: {
      radii: {
        l1: { value: "{radii.md}" }, // 6px — control nhỏ (checkbox, tag nhỏ...)
        l2: { value: "{radii.lg}" }, // 8px — Button, Input, Badge, Select...
        l3: { value: "{radii.xl}" }, // 12px — Menu, Dialog, Card, container lớn
      },
    },
    tokens: {
      fonts: {
        heading: { value: "var(--font-be-vietnam-pro), sans-serif" },
        body: { value: "var(--font-be-vietnam-pro), sans-serif" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
