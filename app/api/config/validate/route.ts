import { NextResponse } from "next/server";
import { validateConfig } from "@/lib/config";

export async function GET() {
  const validation = validateConfig();

  if (validation.valid) {
    return NextResponse.json({
      valid: true,
      message: "All required configuration is set",
    });
  } else {
    return NextResponse.json(
      {
        valid: false,
        errors: validation.errors,
        message: "Some required configuration is missing",
      },
      { status: 400 }
    );
  }
}
