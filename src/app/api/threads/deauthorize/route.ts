import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyMetaSignedRequest } from "@/lib/threads/security";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const signedRequest = form.get("signed_request");
    const secret = process.env.THREADS_APP_SECRET;

    if (typeof signedRequest !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!secret) {
      return NextResponse.json({ error: "Callback not configured" }, { status: 503 });
    }

    const verified = verifyMetaSignedRequest(signedRequest, secret);

    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("threads_connections")
      .delete()
      .eq("threads_user_id", verified.userId);

    if (error) throw error;

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Threads deauthorization callback failed:", error);
    return NextResponse.json(
      { error: "Deauthorization could not be completed" },
      { status: 503 }
    );
  }
}
