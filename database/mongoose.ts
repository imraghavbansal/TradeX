import mongoose from 'mongoose';
const MONGODB_URI = process.env.MONGODB_URI ;

declare let global: typeof globalThis & {
  mongooseCache?: {
	conn: mongoose.Mongoose | null;
	promise: Promise<mongoose.Mongoose> | null;
  };
};

let cached = global.mongooseCache;
if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
    if(!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        // 5s was too tight for a serverless cold start: a fresh Vercel function
        // instance establishing its first-ever connection to Atlas (TLS +
        // auth + server selection) can easily exceed that, causing sign-in to
        // fail with a generic error that looks identical to a wrong password.
        // Capped at 8s rather than higher, since Vercel's Hobby plan kills the
        // whole function at 10s regardless — going higher would just trade a
        // graceful in-app error for an uglier platform-level timeout, leaving
        // ~2s of headroom for the rest of the request to complete.
        cached.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 8000,
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (error) {
        cached.promise = null;
        // The single most common local-dev failure: MONGODB_URI points at the
        // local mongodb-memory-server instance (see scripts/local-db.mjs) but
        // it isn't running. Point straight at the fix instead of surfacing a
        // raw MongooseServerSelectionError.
        if (/127\.0\.0\.1|localhost/.test(MONGODB_URI)) {
            throw new Error(
                'Could not reach the local MongoDB instance. Run `npm run db:local` in a separate terminal ' +
                '(or `npm run dev:all` to start everything together) before using the app.'
            );
        }
        throw error;
    }
    console.log(`Connected to database ${process.env.NODE_ENV} - ${MONGODB_URI}`);
    return cached.conn;
}