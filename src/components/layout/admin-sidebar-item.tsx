"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flex, Text } from "@chakra-ui/react";

import { Tooltip } from "~/components/ui/tooltip";
import type { NavItem } from "./nav-config";

function isItemActive(item: NavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (pathname === item.href) return true;
  if (item.pathPrefix && pathname.startsWith(item.pathPrefix + "/")) return true;
  return false;
}

export function AdminSidebarItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isItemActive(item, pathname);
  const Icon = item.icon;

  const row = (
    <Flex
      align="center"
      gap={2.5}
      px={3}
      py="6px"
      mx={2}
      rounded="l2"
      cursor="pointer"
      h="36px"
      justify={collapsed ? "center" : "flex-start"}
      color={active ? "fg" : "fg.muted"}
      bg={active ? "bg.muted" : "transparent"}
      fontWeight={active ? "medium" : "normal"}
      _hover={{ bg: "bg.muted", color: "fg" }}
      transition="background 0.15s, color 0.15s"
      asChild
    >
      <Link href={item.href ?? "#"} onClick={onNavigate}>
        {Icon ? <Icon size={18} /> : null}
        {!collapsed && <Text fontSize="sm">{item.label}</Text>}
      </Link>
    </Flex>
  );

  if (!collapsed) return row;

  return (
    <Tooltip content={item.label} positioning={{ placement: "right" }}>
      {row}
    </Tooltip>
  );
}
