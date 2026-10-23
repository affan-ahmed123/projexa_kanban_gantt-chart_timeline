import { NextResponse } from "next/server";
import { verifyCode } from "../verification-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

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
    const errorMsg = err instanceof Error ? err.message : "Verification failed";
    console.error("[Projexa Auth] Verify code error:", errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
