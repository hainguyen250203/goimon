import { createAuthClient } from "better-auth/react";
import { adminClient, phoneNumberClient } from "better-auth/client/plugins";

import { ac, admin, manager, superadmin, user } from "./permissions";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: { admin, manager, user, superadmin } }), phoneNumberClient()],
});

export type Session = typeof authClient.$Infer.Session;
