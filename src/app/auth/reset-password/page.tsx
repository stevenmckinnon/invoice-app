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
import { resetPassword } from "@/lib/auth-client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    if (!token) {
      toast.error("Invalid reset link", {
        description: "The password reset link is invalid or has expired.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        toast.error("Error", {
          description:
            result.error.message ||
            "Failed to reset password. The link may have expired.",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Password reset successful!", {
        description:
          "Your password has been updated. Redirecting to sign in...",
      });

      setTimeout(() => {
        router.push("/auth/signin");
      }, 1500);
    } catch (error) {
      console.error("Reset password exception:", error);
      toast.error("Error", {
        description: "Something went wrong. Please try again.",
      });
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="w-full max-w-md">
          <CardHeader className="mb-4 text-center">
            <div className="mb-4 flex flex-col items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft /> Back Home
                </Link>
              </Button>
              <CaleyLogo className="h-24 w-24" />
            </div>
            <CardTitle>
              <h1 className="text-2xl">Invalid reset link</h1>
            </CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              Please request a new password reset link.
            </p>
            <div className="text-center">
              <Link href="/auth/forgot-password">
                <Button className="w-full">Request new link</Button>
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <CardHeader className="mb-4 text-center">
          <div className="mb-4 flex flex-col items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft /> Back Home
              </Link>
            </Button>
            <CaleyLogo className="h-24 w-24" />
          </div>
          <CardTitle>
            <h1 className="text-2xl">Reset your password</h1>
          </CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-muted-foreground text-xs">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>

          <div className="text-muted-foreground text-center text-sm">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
