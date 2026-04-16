import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase, UserModel, ReelModel } from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'reel-vault-secret-key-123';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Find user
    let user = await UserModel.findOne({ email });

    // ── Special Case: Admin Setup & Migration ───────────────────────────────
    if (email === 'admin@gmail.com') {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      if (!user) {
        user = await UserModel.create({
          email: 'admin@gmail.com',
          password: hashedPassword,
          name: 'Admin User'
        });
      } else {
        // If user already exists but password doesn't match, reset it for this transition
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch && password === 'admin123') {
          user.password = hashedPassword;
          await user.save();
        }
      }

      // Migration: Assign all legacy/unassigned reels to admin
      await ReelModel.updateMany(
        { 
          $or: [
            { userId: { $exists: false } },
            { userId: null }
          ]
        },
        { $set: { userId: user._id } }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
