import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  }
}

