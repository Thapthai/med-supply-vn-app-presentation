import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authApi } from "@/lib/api";
import { getAppName } from "@/lib/appAuth";

const authOptions: NextAuthOptions = {
  providers: [
    // Credentials Provider (Email/Password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Missing email");
        }

        try {
          // Check if this is a 2FA verified token (bypass normal login)
          if ((credentials as any)['2fa_token']) {
            const token = (credentials as any)['2fa_token'];
            
            
            // Validate the token by calling the profile endpoint (server-side ใช้ BACKEND_API_URL)
            const apiBase = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/smart-cabinet-cu/api/v1';
            const validateResponse = await fetch(`${apiBase}/auth/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!validateResponse.ok) {
              console.error('❌ Token validation failed:', validateResponse.status);
              throw new Error('Invalid 2FA token');
            }

            const profileData = await validateResponse.json();
            
            const profileUser = profileData.data?.user ?? profileData.data;
            if (profileData.success && profileUser) {
              const userData = profileUser as Record<string, unknown>;
              const displayName =
                (typeof userData.name === "string" && userData.name) ||
                `${(userData.fname as string) ?? ""} ${(userData.lname as string) ?? ""}`.trim() ||
                String(userData.email ?? "");
              return {
                id: String(userData.id),
                email: userData.email as string,
                name: displayName,
                image: (userData.profile_image as string) || (userData.profile_picture as string),
                accessToken: token,
                user: { ...userData, name: displayName },
              };
            } else {
              console.error('❌ Profile data invalid:', profileData);
              throw new Error('Failed to get user profile with 2FA token');
            }
          }

          // Normal login flow
          if (!credentials?.password) {
            throw new Error("Missing password");
          }

          // Call your backend API
          const response = await authApi.login({
            email: credentials.email,
            password: credentials.password
          });

          // Check if 2FA is required
          if ((response as any).requiresTwoFactor && response.data?.tempToken) {
            throw new Error("2FA verification required");
          }

          if (response.success && response.data) {
            const token = response.data.token;

            // Return user object with token
            const u = response.data.user as unknown as Record<string, unknown>;
            const displayName =
              (typeof u.name === 'string' && u.name) ||
              `${(u.fname as string) ?? ''} ${(u.lname as string) ?? ''}`.trim() ||
              String(u.email ?? '');
            const userObj = {
              id: response.data.user.id.toString(),
              email: response.data.user.email,
              name: displayName,
              image: (u.profile_image as string) || (u.profile_picture as string),
              accessToken: token,
              user: { ...response.data.user, name: displayName },
            };


            return userObj;
          } else {
            throw new Error(response.message || "Login failed");
          }
        } catch (error: any) {
          console.error('❌ Credentials auth error:', error);
          
          // Extract error message from axios error response
          if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
          } else if (error.response?.data) {
            throw new Error(error.response.data);
          } else {
            throw new Error(error.message || "Authentication failed");
          }
        }
      }
    }),

    // Firebase Custom Provider
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          throw new Error("Missing Firebase ID token");
        }

        try {
          // Call your backend to verify Firebase token
          const response = await authApi.firebaseLogin(credentials.idToken);

          if (response.success && response.data) {
            const token = response.data.token || response.data.accessToken;

            const u = response.data.user as unknown as Record<string, unknown>;
            const displayName =
              (typeof u.name === 'string' && u.name) ||
              `${(u.fname as string) ?? ''} ${(u.lname as string) ?? ''}`.trim() ||
              String(u.email ?? '');
            const userObj = {
              id: response.data.user.id.toString(),
              email: response.data.user.email,
              name: displayName,
              image: u.profile_picture as string | undefined,
              accessToken: token,
              user: { ...response.data.user, name: displayName },
            };


            return userObj;
          }

          throw new Error(response.message || "Firebase login failed");
        } catch (error: any) {
          console.error('❌ Firebase auth error:', error);
          throw new Error(error.message || "Firebase authentication failed");
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        const accessToken = (user as any).accessToken;
        token.accessToken = accessToken;
        token.user = (user as any).user;
        token.id = (user as any).id;
        token.email = (user as any).email;
        token.name = (user as any).name;
        const u = (user as any).user as Record<string, unknown> | undefined;
        token.is_admin = u?.is_admin === true;
        // ติดชื่อแอปตอน login — ใช้กัน session ข้ามโปรเจกต์บนโดเมนเดียวกัน
        token.appname = getAppName();
      }

      // Handle session update (when updateSession is called)
      if (trigger === "update" && session) {
        if (session.user) {
          token.user = {
            ...(token.user || {}),
            ...session.user,
          };
          token.is_admin = (token.user as { is_admin?: boolean }).is_admin === true;
        }
      }

      if (!user && token.user) {
        token.is_admin = (token.user as { is_admin?: boolean }).is_admin === true;
      }

      return token;
    },
    async session({ session, token }) {

      // Explicitly set accessToken
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken;
      }

      // Set user data
      if (token.user) {
        (session as any).user = {
          ...(token.user as object),
          appname: token.appname,
        };
      } else {
        // Fallback: construct user from token properties
        (session as any).user = {
          id: token.id,
          email: token.email,
          name: token.name,
          appname: token.appname,
        };
      }

      (session as any).appname = token.appname;

      return session;
    }
  },

  pages: {
    signIn: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/auth/login`,
    error: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/auth/login`,
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

