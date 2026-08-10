import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import { connectToDatabase } from "../../../database/mongoose";
import {nextCookies} from "better-auth/next-js";

type AuthInstance = Awaited<ReturnType<typeof initAuth>>;

let authInstance: AuthInstance | null = null;
let authInitPromise: Promise<AuthInstance> | null = null;

async function initAuth() {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) throw new Error('Database connection is not established');

    return betterAuth({
        database: mongodbAdapter(db),
        secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-key-min-32-characters-long-12345',
        baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
        },
        plugins: [nextCookies()],
    });
}

// Lazy singleton so build-time (no DB) doesn't try to connect; real connection
// errors propagate to callers instead of being masked by a fake session.
export const getAuth = async (): Promise<AuthInstance> => {
    if (authInstance) return authInstance;
    if (!authInitPromise) {
        authInitPromise = initAuth().catch((error) => {
            authInitPromise = null;
            throw error;
        });
    }
    const instance = await authInitPromise;
    authInstance = instance;
    return instance;
}

type AuthApi = AuthInstance['api'];

export const auth = {
    api: {
        getSession: async (options: Parameters<AuthApi['getSession']>[0]) => {
            const authInstance = await getAuth();
            return authInstance.api.getSession(options);
        },
        signUpEmail: async (options: Parameters<AuthApi['signUpEmail']>[0]) => {
            const authInstance = await getAuth();
            return authInstance.api.signUpEmail(options);
        },
        signInEmail: async (options: Parameters<AuthApi['signInEmail']>[0]) => {
            const authInstance = await getAuth();
            return authInstance.api.signInEmail(options);
        },
        signOut: async (options: Parameters<AuthApi['signOut']>[0]) => {
            const authInstance = await getAuth();
            return authInstance.api.signOut(options);
        },
    },
};
