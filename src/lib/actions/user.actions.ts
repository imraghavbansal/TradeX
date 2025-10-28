'use server';

import {connectToDatabase} from "../../../database/mongoose";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if(!db) throw new Error('Mongoose connection not connected');

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null }},
            { projection: { _id: 1, id: 1, email: 1, name: 1, country:1 }}
        ).toArray();

        type DbUser = { _id?: unknown; id?: string; email?: string; name?: string };
        return (users as DbUser[])
            .filter((user) => Boolean(user.email) && Boolean(user.name))
            .map((user) => ({
                id: user.id || (user._id !== undefined ? String(user._id) : '') || '',
                email: user.email as string,
                name: user.name as string
            }))
    } catch (e) {
        console.error('Error fetching users for news email:', e)
        return []
    }
}