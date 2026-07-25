"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { authClient } from "~/server/better-auth/client";
import { ThemeToggle } from "./theme-toggle";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Quản lý",
  user: "Nhân viên",
};

function initialsOf(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function NavUser({
  user,
}: {
  user: { name: string; role: string; phoneNumber?: string | null };
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar size="sm">
              <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex items-center gap-3 py-1">
              <Avatar size="lg">
                <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <Badge variant="secondary">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </Badge>
                </div>
                {user.phoneNumber ? (
                  <span className="text-xs text-muted-foreground">
                    {user.phoneNumber}
                  </span>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href="/quan-ly/tuy-chinh" />}>
            <Settings />
            <span>Tuỳ chỉnh tài khoản</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm">Giao diện</span>
          <ThemeToggle />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
