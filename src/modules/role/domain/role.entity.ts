import type { PermissionKey } from "./permission-definitions";

export type Role = {
  id: number;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
};
