import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d";
const BCRYPT_ROUNDS = 12;

export interface AuthedUser {
  id: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

interface JwtPayload {
  sub: string;
  role: string;
}

// ── Password hashing ────────────────────────────────────────────────────────
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Token issuance ──────────────────────────────────────────────────────────
export function generateToken(userId: string, role: string): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
  const payload: JwtPayload = { sub: userId, role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ── Middleware ──────────────────────────────────────────────────────────────
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!JWT_SECRET) {
    res.status(500).json({ error: "JWT_SECRET not configured" });
    return;
  }
  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

// ── OTP ─────────────────────────────────────────────────────────────────────
export function generateOTP(): string {
  // Random 6-digit string, zero-padded.
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
}
