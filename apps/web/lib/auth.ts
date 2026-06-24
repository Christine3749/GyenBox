import bcrypt from "bcryptjs"
import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { z } from "zod"
import { getPrisma } from "./prisma"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const demoAccount = {
  id: "demo-user",
  email: "demo@gyenbox.com",
  password: "GyenBox-2026!",
  name: "Demo Explorer",
}

export function getAuthConfig(): NextAuthConfig {
  const hasDatabase = Boolean(process.env.DATABASE_URL)

  return {
    adapter: hasDatabase ? PrismaAdapter(getPrisma()) : undefined,
    session: {
      strategy: hasDatabase ? "database" : "jwt",
    },
    pages: {
      signIn: "/login",
    },
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(rawCredentials) {
          const parsed = credentialsSchema.safeParse(rawCredentials)
          if (!parsed.success) return null

          if (
            process.env.DEMO_LOGIN_ENABLED === "true" &&
            parsed.data.email.toLowerCase() === demoAccount.email &&
            parsed.data.password === demoAccount.password
          ) {
            return {
              id: demoAccount.id,
              email: demoAccount.email,
              name: demoAccount.name,
              image: null,
            }
          }

          if (!process.env.DATABASE_URL) return null

          const user = await getPrisma().user.findUnique({
            where: { email: parsed.data.email },
          })

          if (!user?.passwordHash) return null
          const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
          if (!isValid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl,
          }
        },
      }),
    ],
    callbacks: {
      session({ session, user, token }) {
        if (session.user) {
          session.user.id = user?.id ?? token.sub ?? ""
        }
        return session
      },
    },
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(getAuthConfig())
