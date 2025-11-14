"use client";
import { Suspense, useState } from "react";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import CaleyLogo from "@/components/CaleyLogo";
import { SignInSuccessAnimation } from "@/components/SignInSuccessAnimation";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

const SignInForm = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSuccessAnimationComplete = () => {
    // Force a page refresh to update session
    window.location.href = callbackUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
        // Don't pass callbackURL - we'll handle redirect after animation
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

      // Show success animation
      setShowSuccessAnimation(true);
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
    <>
      {showSuccessAnimation ? (
        <SignInSuccessAnimation onComplete={handleSuccessAnimationComplete} />
      ) : (
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
                <CardDescription>
                  Sign in to manage your invoices
                </CardDescription>
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
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
          <div className="relative col-span-1 hidden items-center justify-center overflow-hidden md:flex">
            <div className="dither-retro relative h-full w-full">
              <Image
                src="/sign-in.png"
                alt="Sign in to Caley"
                fill
                className="object-cover object-bottom"
              />
            </div>
          </div>
        </div>
      )}
    </>
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
