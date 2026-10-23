import type { ReactElement } from "react";
import { AuthCard } from "@/features/workspace-foundation";

const LoginPage = (): ReactElement => {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <AuthCard initialMode="login" />
    </main>
  );
};

export default LoginPage;
