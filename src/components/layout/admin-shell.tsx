"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { ChefHat, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { DrawerBody, DrawerContent, DrawerRoot, DrawerTitle } from "~/components/ui/drawer";
import { VisuallyHidden } from "@chakra-ui/react";
import { Tooltip } from "~/components/ui/tooltip";

import { AdminSidebarItem } from "./admin-sidebar-item";
import { ADMIN_NAV, filterNavByRole, type NavItem, type Role } from "./nav-config";
import { NavUser } from "./nav-user";

const SIDEBAR_W = "224px";
const SIDEBAR_COLLAPSED_W = "60px";

// Ưu tiên exact-match trước; prefix-match chỉ dùng làm fallback và loại trừ
// href gốc "/quan-ly" (mục Tổng quan) vì nó là prefix của MỌI route con,
// nếu không sẽ luôn thắng trước các route cụ thể hơn.
function findActiveLabel(nav: NavItem[], pathname: string): string {
  const exact = nav.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const prefixed = nav.find(
    (item) =>
      item.href && item.href !== "/quan-ly" && pathname.startsWith(item.href + "/"),
  );
  return prefixed?.label ?? "";
}

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Flex
      h="56px"
      align="center"
      justify={collapsed ? "center" : "flex-start"}
      px={collapsed ? 0 : 4}
      flexShrink={0}
      borderBottomWidth="1px"
      borderColor="border"
    >
      <Flex asChild align="center" gap={2}>
        <Link href="/quan-ly" aria-label="Về trang tổng quan">
          <Box boxSize="6" rounded="l1" overflow="hidden" flexShrink={0}>
            <Image src="/android-chrome-192x192.png" alt="Goimon" width={24} height={24} priority />
          </Box>
          {!collapsed && (
            <Text fontWeight="semibold" fontSize="sm" whiteSpace="nowrap">
              Goimon
            </Text>
          )}
        </Link>
      </Flex>
    </Flex>
  );
}

// Nhãn nhóm — chữ hoa nhỏ + 1 đường kẻ mờ chiếm hết phần còn lại, đúng
// pattern tham khảo từ alix-bo-frontend-v2 (components/admin/AdminSidebarItem.tsx).
// Chiều cao CỐ ĐỊNH, giống nhau ở cả 2 trạng thái (chỉ ẩn/hiện chữ nhãn) — để
// chiều cao chỉ khác nhau lúc thu gọn/mở rộng thì các icon bên dưới mỗi ranh
// giới nhóm sẽ bị "giật" lên xuống theo, do khoảng trống nhãn nhóm co giãn.
function GroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <Flex align="center" gap={2} h="28px" px={collapsed ? 2 : 4}>
      {!collapsed && (
        <Text
          fontSize="xs"
          fontWeight="medium"
          color="fg.subtle"
          letterSpacing="0.06em"
          textTransform="uppercase"
          lineHeight="1"
          flexShrink={0}
        >
          {label}
        </Text>
      )}
      <Box flex={1} h="1px" bg="border" />
    </Flex>
  );
}

function SidebarNav({
  nav,
  collapsed,
  onNavigate,
}: {
  nav: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Box flex={1} overflowY="auto" overflowX="hidden" py={2}>
      {nav.map((item, i) => {
        // So group với item liền trước để biết đây có phải điểm BẮT ĐẦU 1
        // nhóm mới không — chỉ hiện nhãn ở item đầu tiên của mỗi nhóm, không
        // lặp lại nhãn cho từng item bên trong nhóm đó.
        const prevGroup = i > 0 ? nav[i - 1]!.group : undefined;
        const isFirstInGroup = item.group !== undefined && item.group !== prevGroup;
        return (
          <Fragment key={item.key}>
            {isFirstInGroup && <GroupLabel label={item.group!} collapsed={collapsed} />}
            <Box my="1px">
              <AdminSidebarItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </Box>
          </Fragment>
        );
      })}
    </Box>
  );
}

function SidebarContent({
  nav,
  collapsed,
  onNavigate,
}: {
  nav: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Flex direction="column" h="full" w="full" bg="bg">
      <SidebarLogo collapsed={collapsed} />
      <SidebarNav nav={nav} collapsed={collapsed} onNavigate={onNavigate} />
    </Flex>
  );
}

function MobileHeaderTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <IconButton
      aria-label="Mở menu"
      variant="ghost"
      size="sm"
      display={{ base: "flex", md: "none" }}
      onClick={onOpen}
    >
      <Menu />
    </IconButton>
  );
}

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; role: Role; phoneNumber?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = filterNavByRole(ADMIN_NAV, user.role);
  const title = findActiveLabel(nav, pathname);

  // Mặc định mở rộng — không lưu lại lựa chọn thu gọn giữa các lần tải
  // trang, chỉ có tác dụng trong phiên hiện tại.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Flex h="100dvh" bg="bg">
      {/* Desktop sidebar */}
      <Box
        display={{ base: "none", md: "flex" }}
        flexShrink={0}
        h="full"
        w={collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W}
        borderRightWidth="1px"
        borderColor="border"
        transition="width 0.2s ease"
        overflow="hidden"
      >
        <SidebarContent nav={nav} collapsed={collapsed} />
      </Box>

      {/* Mobile drawer */}
      <DrawerRoot
        open={mobileOpen}
        placement="start"
        onOpenChange={(e) => setMobileOpen(e.open)}
      >
        <DrawerContent maxW="240px" p={0}>
          <VisuallyHidden>
            <DrawerTitle>Menu điều hướng</DrawerTitle>
          </VisuallyHidden>
          <DrawerBody p={0}>
            <SidebarContent
              nav={nav}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      {/* Main content */}
      <Flex flex={1} direction="column" h="full" minW={0} overflow="hidden">
        <Flex
          as="header"
          h="56px"
          align="center"
          gap={3}
          px={4}
          flexShrink={0}
          borderBottomWidth="1px"
          borderColor="border"
          position="sticky"
          top={0}
          bg="bg"
          zIndex={10}
        >
          <MobileHeaderTrigger onOpen={() => setMobileOpen(true)} />
          <Tooltip content={collapsed ? "Mở rộng menu" : "Thu gọn menu"}>
            <IconButton
              aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
              variant="ghost"
              size="sm"
              display={{ base: "none", md: "flex" }}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </IconButton>
          </Tooltip>
          <Text flex={1} fontSize="sm" fontWeight="medium" lineClamp={1}>
            {title}
          </Text>
          <Tooltip content="Sang trang gọi món">
            <IconButton
              aria-label="Sang trang gọi món"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/goi-mon")}
            >
              <ChefHat size={18} />
            </IconButton>
          </Tooltip>
          <NavUser user={user} />
        </Flex>
        {/* Không quy định padding ở đây — mỗi page tự set padding của mình
            (xem CLAUDE.md / hướng dẫn tro-ly-ai). Trang có lịch sử/chat cần
            chiếm toàn bộ chiều cao (không padding trên dưới) trong khi các
            trang danh sách bình thường tự thêm `p={{ base: 4, md: 6 }}`.
            `minH={0}` bắt buộc phải có: flex item trong flex column mặc định
            `min-height: auto` (co theo nội dung), nếu thiếu thì nội dung dài
            (vd lịch sử chat) sẽ đẩy `main` cao hơn viewport thay vì bị giới
            hạn đúng phần còn lại — khi đó `overflowY="auto"` bên trong từng
            trang (sidebar lịch sử, khung chat) không bao giờ kích hoạt được,
            cả trang cuộn chung làm sidebar trôi mất theo nội dung chat. */}
        <Box as="main" flex={1} minH={0} overflowY="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
