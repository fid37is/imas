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
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
                    prompt: "consent",
                    access_type: "offline",
                }
            }
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Save the access token and refresh token to the token right after signin
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }

            // If the token is expired, try to refresh it
            if (token.expiresAt && Date.now() > token.expiresAt * 1000) {
                try {
                    const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: process.env.GOOGLE_CLIENT_ID,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET,
                            grant_type: 'refresh_token',
                            refresh_token: token.refreshToken,
                        }),
                    });

                    const tokens = await response.json();

                    if (!response.ok) throw tokens;

                    return {
                        ...token,
                        accessToken: tokens.access_token,
                        expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
                    };
                } catch (error) {
                    console.error('Error refreshing access token', error);
                    return { ...token, error: 'RefreshAccessTokenError' };
                }
            }

            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            session.error = token.error;

            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);