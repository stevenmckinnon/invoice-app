import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@/generated/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        firstName: { label: "First Name", type: "text" },
        lastName: { label: "Last Name", type: "text" },
        isSignUp: { label: "Is Sign Up", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const firstName = credentials?.firstName as string | undefined;
        const lastName = credentials?.lastName as string | undefined;
        
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') return null;

        const isSignUp = credentials.isSignUp === "true";

        if (isSignUp) {
          // Sign up flow
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            throw new Error("User already exists");
          }

          const hashedPassword = await bcrypt.hash(password, 10);

          const user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              firstName: firstName || null,
              lastName: lastName || null,
            },
          });

          const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email!;

          return {
            id: user.id,
            email: user.email!,
            name: fullName,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            fullName,
          };
        } else {
          // Sign in flow
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            return null;
          }

          const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email!;

          return {
            id: user.id,
            email: user.email!,
            name: fullName,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            fullName,
          };
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name as string;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.fullName = token.fullName;
      }
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.fullName = user.fullName;
      }
      return token;
    },
  },
};
