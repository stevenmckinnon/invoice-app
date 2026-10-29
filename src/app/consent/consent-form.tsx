"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const ConsentForm = () => {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);

  const answer = async (accept: boolean) => {
    setPending(accept ? "accept" : "deny");
    // The client plugin adds the signed query; the response redirects back to
    // the app that asked, so there's nothing to do on success
    const { error } = await authClient.oauth2.consent({ accept });
    if (error) {
      toast.error("Couldn't finish connecting", {
        description: error.message ?? "Try again from the app.",
      });
      setPending(null);
    }
  };

  return (
    <div className="mt-6 flex gap-3">
      <Button
        className="flex-1"
        disabled={pending !== null}
        onClick={() => answer(true)}
      >
        {pending === "accept" ? "Connecting…" : "Allow"}
      </Button>
      <Button
        className="flex-1"
        variant="outline"
        disabled={pending !== null}
        onClick={() => answer(false)}
      >
        Cancel
      </Button>
    </div>
  );
};
