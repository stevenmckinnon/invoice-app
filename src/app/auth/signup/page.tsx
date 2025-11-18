"use client";
import { useState } from "react";

import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
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
    <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-2">
      {/* Brand Sidebar */}
      <div className="bg-muted relative hidden flex-col p-12 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 overflow-hidden bg-zinc-900">
          <BackgroundPattern />
          <div className="absolute inset-0 bg-gradient-to-bl from-zinc-900/90 via-zinc-900/50 to-zinc-900/20" />
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
              &quot;Finally, an invoicing tool that understands the creative
              industry. Pure brilliance.&quot;
            </p>
            <footer className="text-base font-medium text-zinc-400">
              Sarah Mitchell, Art Director
            </footer>
          </blockquote>
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
            <h1 className="font-oswald text-3xl font-bold tracking-tight sm:text-4xl">
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
                  type="text"
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
                  type="text"
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
              <Label htmlFor="password">Password</Label>
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
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
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
