import { createAuthClient } from "better-auth/react";
import { adminClient, phoneNumberClient } from "better-auth/client/plugins";

import { ac, admin, manager, user } from "./permissions";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: { admin, manager, user } }), phoneNumberClient()],
});

export type Session = typeof authClient.$Infer.Session;
