import type { ReactElement } from "react";
import { AuthCard } from "@/features/workspace-foundation";

const SignupPage = (): ReactElement => {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <AuthCard initialMode="signup" />
    </main>
  );
};

export default SignupPage;
