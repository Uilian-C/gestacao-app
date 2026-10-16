import { createAuthClient } from 'better-auth/react';

// Login (Better Auth). As rotas ficam em /api/auth/* no mesmo domínio do app.
export const authClient = createAuthClient();
