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
import { signUp } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="h-screen w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden">
      <div className="relative items-center justify-center hidden md:flex col-span-1 p-6 overflow-hidden">
        <div className="relative w-full h-full dither-retro">
          <Image
            src="/signup.jpg"
            alt="Skye, Scotland, UK"
            fill
            className="rounded-lg object-cover object-bottom"
          />
        </div>
      </div>
      <div className="flex items-center justify-center col-span-1 p-6">
        <div className="w-full max-w-md">
          <CardHeader className="text-center mb-4">
            <div className="flex flex-col items-center mb-4 gap-2">
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
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-4">
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
