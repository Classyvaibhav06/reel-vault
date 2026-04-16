import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not defined in environment variables.');
}

// Cache the mongoose connection to avoid re-connecting on every hot-reload
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ── User Schema ─────────────────────────────────────────────────────────────

export interface IUserDocument extends mongoose.Document {
  email: string;
  password: string;
  name?: string;
  created_at: Date;
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const UserModel: mongoose.Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema, 'users');

// ── Reel Schema ─────────────────────────────────────────────────────────────

export interface IReelDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  title: string;
  caption: string;
  category: string;
  thumbnail: string;
  tags: string[];
  created_at: Date;
}

const reelSchema = new mongoose.Schema<IReelDocument>(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    url:       { type: String, required: true },
    title:     { type: String, default: 'Saved Reel' },
    caption:   { type: String, default: '' },
    category:  { type: String, default: 'Other' },
    thumbnail: { type: String, default: '' },
    tags:      { type: [String], default: [] },
    created_at:{ type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const ReelModel: mongoose.Model<IReelDocument> =
  mongoose.models.Reel ||
  mongoose.model<IReelDocument>('Reel', reelSchema, 'reel-vault');

// ── Shared TS type (used across client & server) ──────────────────────────

export type Reel = {
  id: string;
  url: string;
  title: string;
  caption: string;
  category: string;
  thumbnail: string;
  tags: string[];
  created_at: string;
};

