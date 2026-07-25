"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "~/components/ui/sidebar";

import { AdminSidebarItem } from "./admin-sidebar-item";
import { ADMIN_NAV, filterNavByRole, type NavItem, type Role } from "./nav-config";
import { NavUser } from "./nav-user";

// Ưu tiên exact-match trước; prefix-match chỉ dùng làm fallback và loại trừ
// href gốc "/quan-ly" (mục Tổng quan) vì nó là prefix của MỌI route con,
// nếu không sẽ luôn thắng trước các route cụ thể hơn.
function findActiveLabel(nav: NavItem[], pathname: string): string {
  const flat = nav.flatMap((item) => [item, ...(item.children ?? [])]);

  const exact = flat.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const prefixed = flat.find(
    (item) =>
      item.href &&
      item.href !== "/quan-ly" &&
      pathname.startsWith(item.href + "/"),
  );
  return prefixed?.label ?? "";
}

/**
 * Nút thu gọn/mở rộng sidebar nằm ở đáy sidebar (không phải trong header) —
 * chỉ có ý nghĩa ở desktop (chế độ collapsible="icon"), ẩn trên mobile vì
 * sidebar mobile là Sheet bật/tắt qua hamburger trong header.
 */
function SidebarCollapseToggle() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarMenuItem className="hidden md:block">
      <SidebarMenuButton
        onClick={toggleSidebar}
        tooltip={collapsed ? "Mở rộng" : "Thu gọn"}
        className="group-data-[collapsible=icon]:justify-center"
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        <span>Thu gọn</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Trigger mở sidebar (Sheet) trên mobile — dùng icon hamburger 3 gạch quen
 * thuộc thay vì icon panel mặc định của SidebarTrigger (không override được
 * icon đó qua props vì bị hardcode trong component gốc).
 */
function MobileSidebarTrigger() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={toggleSidebar}
    >
      <Menu />
      <span className="sr-only">Mở menu</span>
    </Button>
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
  const nav = filterNavByRole(ADMIN_NAV, user.role);
  const title = findActiveLabel(nav, pathname);

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-14 flex-row items-center justify-center border-b">
          <Link
            href="/quan-ly"
            className="flex w-full items-center gap-2 overflow-hidden px-1 font-semibold group-data-[collapsible=icon]:justify-center"
          >
            <span className="hidden size-6 shrink-0 items-center justify-center rounded bg-primary text-xs text-primary-foreground group-data-[collapsible=icon]:flex">
              G
            </span>
            <span className="truncate group-data-[collapsible=icon]:hidden">
              Goimon
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <AdminSidebarItem key={item.key} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarCollapseToggle />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <MobileSidebarTrigger />
          <span className="flex-1 truncate text-sm font-medium">{title}</span>
          <NavUser user={user} />
        </header>
        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
