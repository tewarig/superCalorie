import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in — superCalorie" };

export default function LoginPage() {
  return (
    <div className="grain flex min-h-screen items-center justify-center px-6 py-16">
      <AuthForm mode="login" />
    </div>
  );
}
