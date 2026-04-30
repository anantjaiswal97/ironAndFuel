import { User, hashPassword, IUser } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';

interface SignupInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResult {
  user: IUser;
  token: string;
}

export async function signup({ email, password, name }: SignupInput): Promise<AuthResult> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    // Note: arguably we shouldn't tell attackers whether an email is registered
    // (helps account enumeration). For a personal/learning project, the clearer
    // UX wins. For a real public app, return generic "signup failed" instead.
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
  });

  const token = signToken({ userId: user._id.toString() });
  return { user, token };
}

export async function login({ email, password }: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  // Important: same error message for "no such user" and "wrong password".
  // Different messages let attackers enumerate which emails are registered.
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = signToken({ userId: user._id.toString() });
  return { user, token };
}
