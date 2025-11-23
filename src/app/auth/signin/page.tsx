"use client";
import { Suspense, useState } from "react";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import CaleyLogo from "@/components/CaleyLogo";
import { BackgroundPattern } from "@/components/hero/background-pattern";
import { SignInSuccessAnimation } from "@/components/SignInSuccessAnimation";
import { Button } from "@/components/ui/button";
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
        <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-2">
          {/* Brand Sidebar */}
          <div className="bg-muted relative hidden flex-col p-12 text-white lg:flex dark:border-r">
            <div className="absolute inset-0 overflow-hidden bg-zinc-900">
              <BackgroundPattern />
              <div className="absolute inset-0 bg-linear-to-tr from-zinc-900/90 via-zinc-900/50 to-zinc-900/20" />
            </div>

            <Link href="/">
              <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
                <CaleyLogo className="h-8 w-8 fill-white text-white" />
                <span className="font-oswald text-xl font-bold tracking-tight">
                  Caley
                </span>
              </div>
            </Link>

            <div className="relative z-20 mt-auto max-w-md">
              <blockquote className="space-y-6">
                <p className="font-oswald text-4xl leading-tight font-medium tracking-tight text-white drop-shadow-sm">
                  &quot;The most intuitive invoicing system I&apos;ve ever used.
                  It just gets out of the way and lets me work.&quot;
                </p>
                <footer className="text-base font-medium text-zinc-400">
                  Alex Chen, Freelance Developer
                </footer>
              </blockquote>
            </div>
          </div>

          {/* Sign In Form */}
          <div className="flex flex-col items-center justify-center p-6 sm:p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="flex flex-col space-y-2 text-center">
                <div className="mb-4 flex justify-center lg:hidden">
                  <Link href="/">
                    <CaleyLogo className="h-12 w-12" />
                  </Link>
                </div>
                <h1 className="font-oswald text-3xl font-bold tracking-tight sm:text-4xl">
                  Welcome back
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your credentials to access your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-primary text-sm font-medium hover:underline"
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
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full font-medium"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Don&apos;t have an account?{" "}
                </span>
                <Link
                  href="/auth/signup"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </motion.div>
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
        <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">
            Loading secure session...
          </p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
