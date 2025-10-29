"use client";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CaleyLogo from "@/components/CaleyLogo";
import { signIn } from "@/lib/auth-client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

const SignInForm = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
        callbackURL: callbackUrl,
      });

      if (result.error) {
        toast.error("Sign in failed", {
          description:
            result.error.message ||
            "Invalid email or password. Please check your credentials and try again.",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Welcome back!", {
        description: "You have successfully signed in.",
      });

      // Force a page refresh to update session
      setTimeout(() => {
        window.location.href = callbackUrl;
      }, 500);
    } catch (error) {
      console.error("Signin exception:", error);
      toast.error("Sign in failed", {
        description:
          "Invalid email or password. Please check your credentials and try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="grid h-screen w-full grid-cols-1 overflow-hidden md:grid-cols-2">
      <div className="col-span-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <CardHeader className="mb-4 text-center">
            <div className="mb-4 flex flex-col items-center gap-2">
              <Link href="/">
                <CaleyLogo className="h-24 w-24" />
              </Link>
            </div>
            <CardTitle>
              <h1 className="text-2xl">Welcome to Caley</h1>
            </CardTitle>
            <CardDescription>Sign in to manage your invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-primary text-xs hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-muted-foreground mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
      <div className="relative col-span-1 hidden items-center justify-center overflow-hidden p-6 md:flex">
        <div className="dither-retro relative h-full w-full">
          <Image
            src="/signin.jpg"
            alt="Glenfinnan Viaduct, A830 Road, Glenfinnan, Scotland, UK"
            fill
            className="rounded-lg object-cover object-bottom"
          />
        </div>
      </div>
    </div>
  );
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading sign in...</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
