import { NextResponse } from "next/server";
import { verifyCode } from "../verification-store";

// In-memory rate limiting store
const globalVerifyRateLimit = globalThis as unknown as {
  __verifyEmailRateLimit?: Map<string, number[]>;
  __verifyIpRateLimit?: Map<string, number[]>;
};

if (!globalVerifyRateLimit.__verifyEmailRateLimit) {
  globalVerifyRateLimit.__verifyEmailRateLimit = new Map<string, number[]>();
}
if (!globalVerifyRateLimit.__verifyIpRateLimit) {
  globalVerifyRateLimit.__verifyIpRateLimit = new Map<string, number[]>();
}

const verifyEmailRateLimit = globalVerifyRateLimit.__verifyEmailRateLimit;
const verifyIpRateLimit = globalVerifyRateLimit.__verifyIpRateLimit;

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
};

export async function POST(request: Request) {
  try {
    const now = Date.now();
    const clientIp = getClientIp(request);
    const oneHourAgo = now - 60 * 60 * 1000;

    // IP Rate Limit: Max 30 requests per hour
    const ipTimestamps = (verifyIpRateLimit.get(clientIp) || []).filter((ts) => ts > oneHourAgo);
    if (ipTimestamps.length >= 30) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many verification attempts from this IP. Please try again later."
        },
        {
          status: 429,
          headers: { "Retry-After": "3600" }
        }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { email, code } = (body || {}) as { email?: unknown; code?: unknown };

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    // Email Rate Limit: Max 10 requests per 10 minutes
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const emailTimestamps = (verifyEmailRateLimit.get(cleanEmail) || []).filter((ts) => ts > tenMinutesAgo);
    if (emailTimestamps.length >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many verification attempts for this email. Please try again later."
        },
        {
          status: 429,
          headers: { "Retry-After": "600" }
        }
      );
    }

    // Record timestamps for rate limiting
    ipTimestamps.push(now);
    verifyIpRateLimit.set(clientIp, ipTimestamps);

    emailTimestamps.push(now);
    verifyEmailRateLimit.set(cleanEmail, emailTimestamps);

    const result = verifyCode(cleanEmail, cleanCode);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.reason || "Invalid verification code." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification successful."
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(errorMsg);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
