import { createHash } from "crypto";
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

    const userHash = createHash("sha256")
      .update(verified.userId)
      .digest("hex");

    const { data: existing, error: lookupError } = await admin
      .from("threads_data_deletion_requests")
      .select("confirmation_code")
      .eq("threads_user_id", userHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let confirmationCode = existing?.confirmation_code;

    if (!confirmationCode) {
      const { data: created, error: createError } = await admin
        .from("threads_data_deletion_requests")
        .insert({
          threads_user_id: userHash,
          status: "pending",
        })
        .select("confirmation_code")
        .single();

      if (createError || !created) throw createError;
      confirmationCode = created.confirmation_code;
    }

    const { error: deleteError } = await admin
      .from("threads_connections")
      .delete()
      .eq("threads_user_id", verified.userId);

    if (deleteError) throw deleteError;

    const { error: updateError } = await admin
      .from("threads_data_deletion_requests")
      .update({ status: "completed" })
      .eq("confirmation_code", confirmationCode);

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        url: `https://anamzi-xi.vercel.app/api/threads/data-deletion/status/${confirmationCode}`,
        confirmation_code: confirmationCode,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Threads data deletion callback failed:", error);
    return NextResponse.json(
      { error: "Data deletion could not be completed" },
      { status: 503 }
    );
  }
}
