"use client";

import { useEffect, useRef } from "react";
import { Box, Image } from "@chakra-ui/react";

/**
 * Avatar Trợ lý AI bay lượn ở màn hình chào — copy nguyên kỹ thuật từ
 * `FloatingLensyIcon` (alix-bo-frontend-v2/components/lensy/LensyChat.tsx),
 * dự án Chakra cùng tổ chức nên được phép lấy trực tiếp pattern (xem
 * CLAUDE.md). Không dùng thư viện animation nào — thuần Web Animations API
 * (`element.animate()`) + CSS Motion Path (`offset-path`) của trình duyệt,
 * không cần cài thêm package.
 *
 * Mỗi lượt chọn NGẪU NHIÊN 1 kiểu di chuyển cho sinh động: bay vòng oval
 * (offset-path, mượt), lò cò sang trái/phải 3 nhịp, hoặc bay thẳng lên rồi
 * xoay tít — xen kẽ trôi bồng bềnh nhẹ lúc "nghỉ" giữa các động tác.
 */
export function FloatingAssistantAvatar({ size = 80 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    // Bay 1 vòng oval mượt bằng CSS Motion Path (offset-path = đường cong
    // ellipse thật → không giật khựng như animate translate tay). offset-anchor
    // "0 0" để 0%/100% trùng vị trí gốc; vị trí do offset-distance lo, transform
    // lo scale/nghiêng — 2 animation compose lên nhau.
    const oval = () => {
      if (cancelled) return;
      el.style.transformOrigin = "center";
      const rx = Math.round(rnd(40, 60));
      const ry = Math.round(rnd(28, 44));
      const sweep = Math.random() < 0.5 ? 1 : 0;
      const spin = sweep ? 1 : -1;
      const dur = 3600 + Math.random() * 900;
      el.style.offsetPath = `path("M0,0 A${rx},${ry} 0 1,${sweep} 0,${-2 * ry} A${rx},${ry} 0 1,${sweep} 0,0")`;
      el.style.offsetRotate = "0deg";
      el.style.offsetAnchor = "0px 0px";
      el.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], {
        duration: dur,
        easing: "cubic-bezier(.4,0,.6,1)",
      });
      const pulse = el.animate(
        [
          { transform: "scale(1,1) rotate(0deg)", offset: 0 },
          { transform: "scale(1.08,0.9) rotate(0deg)", offset: 0.05 },
          { transform: `scale(0.9,0.9) rotate(${-4 * spin}deg)`, offset: 0.25 },
          { transform: "scale(0.8,0.8) rotate(0deg)", offset: 0.5 },
          { transform: `scale(0.9,0.9) rotate(${4 * spin}deg)`, offset: 0.75 },
          { transform: "scale(1.08,0.92) rotate(0deg)", offset: 0.95 },
          { transform: "scale(1,1) rotate(0deg)", offset: 1 },
        ],
        { duration: dur, easing: "ease-in-out" },
      );
      pulse.onfinish = () => {
        el.style.offsetPath = "none";
        idle();
      };
    };

    // Lò cò: nhún nhảy sang 1 bên 3 nhịp rồi lò cò về chỗ (mỗi nhịp bật lên + đáp bẹp chân).
    const hop = () => {
      if (cancelled) return;
      el.style.transformOrigin = "center bottom";
      const dir = Math.random() < 0.5 ? -1 : 1;
      const step = Math.round(rnd(22, 30));
      const hopH = Math.round(rnd(18, 26));
      const xs = [0, dir * step, dir * 2 * step, dir * 3 * step, dir * 2 * step, dir * step, 0];
      const segs = xs.length - 1;
      const kf: Keyframe[] = [{ transform: "translate(0px,0px) rotate(0deg) scale(1,1)", offset: 0 }];
      for (let i = 0; i < segs; i++) {
        const midX = Math.round((xs[i]! + xs[i + 1]!) / 2);
        kf.push({
          transform: `translate(${midX}px,-${hopH}px) rotate(${dir * 6}deg) scale(0.9,1.12)`,
          offset: 0.02 + 0.96 * ((i + 0.5) / segs),
          easing: "ease-out",
        });
        kf.push({
          transform: `translate(${xs[i + 1]}px,2px) rotate(0deg) scale(1.16,0.84)`,
          offset: 0.02 + 0.96 * ((i + 1) / segs),
          easing: "ease-in",
        });
      }
      kf.push({ transform: "translate(0px,0px) rotate(0deg) scale(1,1)", offset: 1 });
      el.animate(kf, { duration: 3400 + Math.random() * 700, easing: "linear" }).onfinish = idle;
    };

    // Bay thẳng nhẹ lên rồi xoay tít tại chỗ (số vòng chẵn 360° → đáp lại đúng chiều, không giật).
    const upSpin = () => {
      if (cancelled) return;
      el.style.transformOrigin = "center";
      const upH = Math.round(rnd(42, 62));
      const spinDeg = (Math.random() < 0.5 ? 1 : -1) * 360 * (2 + Math.floor(rnd(0, 2)));
      el.animate(
        [
          { transform: "translate(0px,0px) rotate(0deg) scale(1,1)", offset: 0 },
          { transform: "translate(0px,4px) rotate(0deg) scale(1.1,0.88)", offset: 0.08, easing: "ease-out" },
          {
            transform: `translate(0px,-${upH}px) rotate(0deg) scale(0.96,1.08)`,
            offset: 0.3,
            easing: "cubic-bezier(.2,.7,.3,1)",
          },
          { transform: `translate(0px,-${upH}px) rotate(${spinDeg}deg) scale(0.9,0.9)`, offset: 0.66, easing: "ease-in-out" },
          { transform: `translate(0px,3px) rotate(${spinDeg}deg) scale(1.12,0.86)`, offset: 0.9, easing: "ease-in" },
          { transform: `translate(0px,0px) rotate(${spinDeg}deg) scale(1,1)`, offset: 1 },
        ],
        { duration: 3300 + Math.random() * 600, easing: "linear" },
      ).onfinish = idle;
    };

    // Nghỉ giữa các động tác: trôi bồng bềnh nhẹ, đung đưa + nghiêng tí cho có hồn.
    const idle = () => {
      if (cancelled) return;
      el.style.transformOrigin = "center";
      el.animate(
        [
          { transform: "translate(0px,0px) rotate(-2deg) scale(1,1)", offset: 0 },
          { transform: "translate(3px,-6px) rotate(1.5deg) scale(1.01,1)", offset: 0.28 },
          { transform: "translate(0px,-9px) rotate(-1deg) scale(0.99,1.02)", offset: 0.52 },
          { transform: "translate(-3px,-5px) rotate(2deg) scale(1.01,1)", offset: 0.76 },
          { transform: "translate(0px,0px) rotate(-2deg) scale(1,1)", offset: 1 },
        ],
        { duration: 2800, easing: "ease-in-out", iterations: 2.2 },
      ).onfinish = nextMove;
    };

    // Mỗi lượt chọn NGẪU NHIÊN một kiểu di chuyển cho sinh động.
    const nextMove = () => {
      if (cancelled) return;
      const r = Math.random();
      if (r < 0.4) oval();
      else if (r < 0.72) hop();
      else upSpin();
    };

    const timer = window.setTimeout(nextMove, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      el.getAnimations().forEach((a) => a.cancel());
    };
  }, []);

  return (
    <Box
      ref={ref}
      boxSize={`${size}px`}
      rounded="l2"
      overflow="hidden"
      css={{ transformOrigin: "center", willChange: "transform, offset-distance" }}
    >
      <Image src="/assistant-avatar.svg" alt="Trợ lý AI" boxSize="full" />
    </Box>
  );
}
