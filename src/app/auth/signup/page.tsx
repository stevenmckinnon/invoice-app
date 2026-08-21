"use client";
import { useState } from "react";

import { Loading02Icon, SparklesIcon, Tick01Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { toast } from "sonner";

import CaleyLogo from "@/components/CaleyLogo";
import { BackgroundPattern } from "@/components/hero/background-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: fullName,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        const errorMessage =
          result.error.message || "Failed to create account. Please try again.";

        if (
          errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate")
        ) {
          toast.error("Account already exists", {
            description:
              "An account with this email already exists. Please sign in instead.",
          });
        } else {
          toast.error("Sign up failed", {
            description: errorMessage,
          });
        }
        setIsLoading(false);
        return;
      }

      // After successful signup, update the user with firstName and lastName
      if (result.data) {
        try {
          await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fullName,
              firstName: formData.firstName,
              lastName: formData.lastName,
              fullName: fullName,
            }),
          });
        } catch (error) {
          console.error("Failed to update profile with names:", error);
        }
      }

      toast.success("Account created successfully!", {
        description: "Welcome to Caley.",
      });

      // Force a page refresh to update session
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (error) {
      console.error("Signup exception:", error);
      toast.error("Sign up failed", {
        description: "Failed to create account. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* Brand Sidebar */}
      <div className="bg-muted relative hidden flex-col p-12 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 overflow-hidden bg-zinc-900 dark:bg-card">
          <BackgroundPattern />
          <div className="absolute inset-0 bg-linear-to-bl from-zinc-900/90 via-zinc-900/50 to-zinc-900/20 dark:from-card/90 dark:via-card/50 dark:to-card/20" />
        </div>

        <Link href="/">
          <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
            <CaleyLogo className="h-8 w-8 fill-white text-white" />
            <span className="text-xl font-bold tracking-tight">
              Caley
            </span>
          </div>
        </Link>

        <div className="relative z-20 mt-auto max-w-md">
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-lg font-medium text-white">
              <HugeiconsIcon icon={Tick01Icon} className="h-5 w-5 shrink-0 text-white/70" />
              Track day rates, overtime, and per diems
            </li>
            <li className="flex items-center gap-3 text-lg font-medium text-white">
              <HugeiconsIcon icon={Tick01Icon} className="h-5 w-5 shrink-0 text-white/70" />
              Send a branded PDF invoice in under a minute
            </li>
            <li className="flex items-center gap-3 text-lg font-medium text-white">
              <HugeiconsIcon icon={Tick01Icon} className="h-5 w-5 shrink-0 text-white/70" />
              Built specifically for film and TV freelancers
            </li>
          </ul>
        </div>
      </div>

      {/* Sign Up Form */}
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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Create an account
            </h1>
            <p className="text-muted-foreground text-sm">
              Join thousands of freelancers managing their business better
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
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
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 flex items-center rounded-sm px-2 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <HugeiconsIcon icon={ViewOffIcon} className="h-4 w-4" />
                  ) : (
                    <HugeiconsIcon icon={ViewIcon} className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-muted-foreground text-[0.8rem]">
                Must be at least 6 characters long
              </p>
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-medium"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              href="/auth/signin"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
