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
import WWELogo from "@/components/WWELogo";
import { signIn } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
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
    <div className="h-[calc(100dvh-64px)] w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden">
      <div className="flex items-center justify-center col-span-1 p-6 pt-0">
        <div className="w-full max-w-md -mt-24 md:mt-0">
          <CardHeader className="text-center mb-4">
            <div className="flex justify-center mb-4">
              <WWELogo className="h-24 w-24" />
            </div>
            <CardTitle>
              <h1 className="text-2xl">Welcome to WWE Invoice App</h1>
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
                    className="text-xs text-primary hover:underline"
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

            <div className="text-center text-sm text-muted-foreground mt-4">
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
      <div className="relative items-center justify-center hidden md:flex col-span-1 p-6 pt-0 overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src="/cena.JPG"
            alt="Cena"
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
        <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-64px)] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading sign in...</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
