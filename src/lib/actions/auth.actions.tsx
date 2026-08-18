'use server'
import {auth} from "../better-auth/auth";
import { inngest } from "../inngest/client";
import {headers} from "next/headers";  

export const signUpWithEmail = async ({email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry}: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            headers: await headers(),
            body: {
                email: email,
                password: password,
                name: fullName,
            }
        })
        if (response) {
            // Fire-and-forget: the welcome-email event is a side effect, not part of
            // the critical signup path, so it shouldn't block the response.
            // `emailAndPassword.autoSignIn` on the auth config already establishes the
            // session on signUpEmail — no need for a second, redundant signInEmail call.
            inngest.send({
                name: 'app/user.created',
                data: {
                    email: email,
                    name: fullName,
                    country: country,
                    investmentGoals: investmentGoals,
                    riskTolerance: riskTolerance,
                    preferredIndustry: preferredIndustry,
                },
            }).catch((ingErr) => {
                console.warn('Inngest event failed (skipping):', ingErr);
            });
        }
        return { success: true, data: response };
} catch (error) {
        console.error("Sign Up Error (Server Action):", error);
        const message = error instanceof Error ? error.message : 'Sign up failed. Please try again.';
        return { success: false, error: message };
    }
}


export const signInWithEmail = async ({email, password}: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({
            headers: await headers(),
            body: {
                email: email,
                password: password,
            }
        })
        return { success: true, data: response };
} catch (error) {
        console.error("Sign In Error (Server Action):", error);
        // Surface the real reason (still safe to show — better-auth's own
        // errors are user-facing messages like "Invalid email or password",
        // not stack traces) instead of a single generic string that made
        // every failure mode — wrong password, DB hiccup, cookie issue —
        // look identical and undebuggable from the outside.
        const message = error instanceof Error ? error.message : 'Sign in failed. Please try again.';
        return { success: false, error: message };
    }
}


export const signOut = async () => {
    try {
        await auth.api.signOut({headers: await headers()});
        return { success: true };
    }

    catch (error) {
        console.error("Sign Out Error (Server Action):", error);
        return { success: false, error: 'Sign out failed. Please try again.' };
    }
}



