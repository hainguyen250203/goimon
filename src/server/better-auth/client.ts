import { createAuthClient } from "better-auth/react";
import { adminClient, phoneNumberClient } from "better-auth/client/plugins";

import { ac, admin, manager, user, viewer } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles: { admin, manager, user, viewer } }),
    phoneNumberClient(),
  ],
});

export type Session = typeof authClient.$Infer.Session;
