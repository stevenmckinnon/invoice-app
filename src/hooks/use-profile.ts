import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Profile = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  fullName: string | null;
  image: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  dateOfBirth: string | null;
  iban: string | null;
  swiftBic: string | null;
  accountNumber: string | null;
  sortCode: string | null;
  bankAddress: string | null;
  currency: string | null;
};

export type UpdateProfileInput = Partial<Omit<Profile, "id" | "image">> & {
  name?: string;
  fullName?: string;
};

export const fetchProfile = async (): Promise<Profile> => {
  const res = await fetch("/api/profile");
  if (!res.ok) {
    throw new Error("Failed to fetch profile");
  }
  return res.json();
};

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileInput): Promise<Profile> => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to update profile");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully!", {
        description: "Your information will be used for all future invoices.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile", {
        description: error.message || "Please try again later.",
      });
    },
  });
};
