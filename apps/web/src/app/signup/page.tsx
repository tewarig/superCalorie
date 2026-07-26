import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up — superCalorie" };

export default function SignupPage() {
  return (
    <div className="grain flex min-h-screen items-center justify-center px-6 py-16">
      <AuthForm mode="signup" />
    </div>
  );
}
