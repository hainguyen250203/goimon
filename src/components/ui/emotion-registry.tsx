"use client";

import { useState } from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";

/**
 * Chakra v3 vẫn dùng Emotion's <Global> để inject global styles (xem
 * ChakraProvider trong @chakra-ui/react/styled-system/provider.js) — nhưng
 * Next.js App Router cần 1 cache registry riêng để style SSR-extract đúng
 * cách, nếu không <Global> render ra <style> lúc SSR nhưng KHÔNG render gì
 * lúc hydrate (client-side Emotion inject style qua side-effect ngoài React
 * tree), gây hydration mismatch thật (React error #418) — không phải noise
 * dev-mode. Đây là pattern chuẩn chính thức của Next.js cho mọi thư viện
 * dùng Emotion trong App Router.
 */
export function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "cgv" });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key="emotion-css"
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
