"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";

import type { NavItem } from "./nav-config";

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href) {
    if (pathname === item.href) return true;
    if (item.pathPrefix && pathname.startsWith(item.pathPrefix + "/"))
      return true;
  }
  return item.children?.some((child) => isItemActive(child, pathname)) ?? false;
}

export function AdminSidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isItemActive(item, pathname);

  if (!item.children || item.children.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={item.href ?? "#"} />}
          isActive={active}
          tooltip={item.label}
        >
          {item.icon ? <item.icon /> : null}
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={active} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton isActive={active} tooltip={item.label}>
              {item.icon ? <item.icon /> : null}
              <span>{item.label}</span>
              <ChevronRight className="ml-auto transition-transform group-data-[panel-open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          }
        />
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.key}>
                <SidebarMenuSubButton
                  render={<Link href={child.href ?? "#"} />}
                  isActive={isItemActive(child, pathname)}
                >
                  <span>{child.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
