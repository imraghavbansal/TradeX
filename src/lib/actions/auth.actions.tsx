'use server'
import {auth} from "../better-auth/auth";
import { inngest } from "../inngest/client";
import {headers} from "next/headers";  

export const signUpWithEmail = async ({email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry}: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            body: {
                email: email,
                password: password,
                name: fullName,
            }
        })
        if(response) {
            await inngest.send({
                name: 'app/user.created',
                data: {
                    email: email,
                    name: fullName,
                    country: country,
                    investmentGoals: investmentGoals,
                    riskTolerance: riskTolerance,
                    preferredIndustry: preferredIndustry,
            }
        })
        }
        return { success: true, data: response };
} catch (error) {
        console.error("Sign Up Error (Server Action):", error);
        return { success: false, error: 'Sign up failed. Please try again.' };
    }
}


export const signInWithEmail = async ({email, password}: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({
            body: {
                email: email,
                password: password,
            }
        })
        return { success: true, data: response };
} catch (error) {
        console.error("Sign In Error (Server Action):", error);
        return { success: false, error: 'Sign in failed. Please try again.' };
    }
}


export const signOut = async () => {
    try {
        await auth.api.signOut({headers: await headers()});
    }

    catch (error) {
        console.error("Sign Out Error (Server Action):", error);
        return { success: false, error: 'Sign out failed. Please try again.' };
    }
}



