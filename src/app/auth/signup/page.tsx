"use client";
import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import CaleyLogo from "@/components/CaleyLogo";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="grid h-screen w-full grid-cols-1 overflow-hidden md:grid-cols-2">
      <div className="relative col-span-1 hidden items-center justify-center overflow-hidden md:flex">
        <div className="dither-retro relative h-full w-full">
          <Image
            src="/sign-up.png"
            alt="Sign up to Caley"
            fill
            className="object-cover object-bottom"
          />
        </div>
      </div>
      <div className="col-span-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <CardHeader className="mb-4 text-center">
            <div className="mb-4 flex flex-col items-center gap-2">
              <Link href="/">
                <CaleyLogo className="h-24 w-24" />
              </Link>
            </div>
            <CardTitle>
              <h1 className="text-2xl">Join Caley</h1>
            </CardTitle>
            <CardDescription>
              Create your account to start managing invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  />
                </div>
              </div>

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
                <p className="text-muted-foreground text-xs">
                  Must be at least 6 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-muted-foreground mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}
