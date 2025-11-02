"use client";
import { useEffect, useState } from "react";

import { format } from "date-fns";
import {
  AlertTriangle,
  Camera,
  Key,
  Loader2,
  Monitor,
  MoonIcon,
  Settings,
  Shield,
  SunIcon,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useThemeTransition } from "@/components/ui/shadcn-io/theme-toggle-button";
import { Switch } from "@/components/ui/switch";
import { changePassword, signOut, useSession } from "@/lib/auth-client";

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  token: string;
}

const SettingsPage = () => {
  const { startTransition } = useThemeTransition();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Password Change State
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Account Deletion State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteData, setDeleteData] = useState({
    password: "",
    confirmation: "",
  });

  // Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        revokeOtherSessions: true, // Revoke other sessions for security
      });

      if (result.error) {
        toast.error("Failed to change password", {
          description:
            result.error.message ||
            "Please check your current password and try again.",
        });
        setChangingPassword(false);
        return;
      }

      toast.success("Password changed successfully!", {
        description:
          "Your password has been updated. Other sessions have been revoked.",
      });

      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        toast.success("Session revoked successfully");
        fetchSessions();
      } else {
        const error = await response.json();
        toast.error("Failed to revoke session", {
          description: error.error,
        });
      }
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error("Failed to revoke session");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteData.confirmation !== "DELETE MY ACCOUNT") {
      toast.error("Invalid confirmation", {
        description: 'Please type "DELETE MY ACCOUNT" to confirm.',
      });
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        toast.success("Account deleted", {
          description:
            "Your account and all data have been permanently deleted.",
        });

        // Sign out and redirect
        await signOut();
        window.location.href = "/";
      } else {
        const error = await response.json();
        toast.error("Failed to delete account", {
          description: error.error,
        });
        setDeletingAccount(false);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
      setDeletingAccount(false);
    }
  };

  const getBrowserInfo = (userAgent: string | null) => {
    if (!userAgent) return "Unknown Browser";

    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  };

  const handleThemeToggle = (theme: "light" | "dark") => {
    // Inject animation styles for theme transitions
    const styleId = `theme-transition-${Date.now()}`;
    const style = document.createElement("style");
    style.id = styleId;

    // Circle blur animation from theme toggle button
    const css = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) { 
          animation: none;
        }
        ::view-transition-new(root) {
          animation: circle-blur-expand 0.5s ease-out;
          transform-origin: center center;
          filter: blur(0);
        }
        @keyframes circle-blur-expand {
          from {
            clip-path: circle(0% at 50% 50%);
            filter: blur(4px);
          }
          to {
            clip-path: circle(150% at 50% 50%);
            filter: blur(0);
          }
        }
      }
    `;

    style.textContent = css;
    document.head.appendChild(style);

    // Clean up animation styles after transition
    setTimeout(() => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    }, 3000);

    startTransition(() => {
      setTheme(theme);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Profile photo updated");
        // Reload the page to get updated session data
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error("Failed to upload photo", {
          description: error.error,
        });
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setDeletingPhoto(true);
    try {
      const response = await fetch("/api/profile/photo", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Profile photo removed");
        // Reload the page to get updated session data
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error("Failed to delete photo", {
          description: error.error,
        });
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    } finally {
      setDeletingPhoto(false);
    }
  };

  const currentSessionToken = session?.session?.token;

  if (!session?.user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 pb-28 md:pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and preferences
        </p>
      </div>

      {/* General Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Preferences
          </CardTitle>
          <CardDescription>Manage your preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme">Theme</Label>
              <p className="text-muted-foreground text-sm">
                Change the theme of the app
              </p>
            </div>
            <div
              className="group inline-flex items-center gap-2"
              data-state={theme === "dark" ? "checked" : "unchecked"}
            >
              <span
                id="theme-light"
                className="group-data-[state=checked]:text-muted-foreground/70 cursor-pointer text-left text-sm font-medium"
                aria-controls="theme"
                onClick={() => handleThemeToggle("light")}
              >
                <SunIcon className="size-4" aria-hidden="true" />
              </span>
              <Switch
                id="theme"
                checked={theme === "dark"}
                onCheckedChange={(checked) =>
                  handleThemeToggle(checked ? "dark" : "light")
                }
                aria-labelledby="theme-dark theme-light"
                aria-label="Toggle between dark and light mode"
              />
              <span
                id="theme-dark"
                className="group-data-[state=unchecked]:text-muted-foreground/70 cursor-pointer text-right text-sm font-medium"
                aria-controls="theme"
                onClick={() => handleThemeToggle("dark")}
              >
                <MoonIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your account details and email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Photo */}
          <div>
            <Label>Profile Photo</Label>
            <div className="mt-3 flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={session.user.image || undefined}
                  alt="Profile photo"
                />
                <AvatarFallback className="text-xl">
                  {(session.user.name ||
                    session.user.email ||
                    "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingPhoto}
                    className="relative"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </Button>
                  {session.user.image && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingPhoto || uploadingPhoto}
                      onClick={handlePhotoDelete}
                    >
                      {deletingPhoto ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  JPG, PNG or WebP. Max 512KB. Will be optimized to 128x128px.
                </p>
              </div>
            </div>
          </div>
          <div>
            <Label>Email Address</Label>
            <Input
              value={session.user.email || ""}
              disabled
              className="mt-1.5"
            />
            <p className="text-muted-foreground mt-1 text-sm">
              Your email address cannot be changed
            </p>
          </div>
          <div>
            <Label>Account ID</Label>
            <Input
              value={session.user.id}
              disabled
              className="mt-1.5 font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Password & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password & Security
          </CardTitle>
          <CardDescription>
            Manage your password and account security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowPasswordDialog(true)} variant="outline">
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage devices and sessions where you&apos;re currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No active sessions found
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const isCurrentSession = sess.token === currentSessionToken;
                return (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {getBrowserInfo(sess.userAgent)}
                        </p>
                        {isCurrentSession && (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {sess.ipAddress || "Unknown IP"} • Signed in{" "}
                        {format(
                          new Date(sess.createdAt),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Expires{" "}
                        {format(new Date(sess.expiresAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    {!isCurrentSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="mb-1 text-sm font-medium">Delete Account</h4>
              <p className="text-muted-foreground mb-3 text-sm">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="mt-1.5"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Must be at least 8 characters long
              </p>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Warning
              </h4>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                <li>All your invoices will be deleted</li>
                <li>Your profile information will be removed</li>
                <li>All sessions will be terminated</li>
                <li>This action cannot be reversed</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="delete-password">Confirm Your Password</Label>
              <Input
                id="delete-password"
                type="password"
                value={deleteData.password}
                onChange={(e) =>
                  setDeleteData({ ...deleteData, password: e.target.value })
                }
                className="mt-1.5"
                placeholder="Enter your password"
              />
            </div>
            <div>
              <Label htmlFor="delete-confirmation">
                Type &quot;DELETE MY ACCOUNT&quot; to confirm
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteData.confirmation}
                onChange={(e) =>
                  setDeleteData({ ...deleteData, confirmation: e.target.value })
                }
                className="mt-1.5"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteData({ password: "", confirmation: "" });
              }}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteDialog(false);
                setShowDeleteConfirm(true);
              }}
              disabled={
                !deleteData.password ||
                deleteData.confirmation !== "DELETE MY ACCOUNT"
              }
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This is your last chance. Once you confirm, your account and all
              associated data will be permanently deleted. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteData({ password: "", confirmation: "" });
              }}
              disabled={deletingAccount}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, delete my account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
