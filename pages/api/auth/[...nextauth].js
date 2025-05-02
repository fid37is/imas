// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
                    prompt: "consent",
                    access_type: "offline",
                }
            }
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Persist the OAuth access_token to the token right after sign in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }
            return token;
        },
        async session({ session, token }) {
            // Send properties to the client, like an access_token from a provider
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            session.expiresAt = token.expiresAt;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    // Enable debug messages in the console if you're having problems
    debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);