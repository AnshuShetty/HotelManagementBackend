import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

export function signToken(payload, secret, options) {
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export async function authenticateUser(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return user ? ok : null;
}
