import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { code } = await context.params;

    if (!/^[0-9a-f-]{36}$/i.test(code)) {
      return new NextResponse("Invalid confirmation code", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("threads_data_deletion_requests")
      .select("status")
      .eq("confirmation_code", code)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new NextResponse("Deletion request not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(
      data.status === "completed"
        ? "Your Threads data deletion request has been completed."
        : "Your Threads data deletion request is being processed.",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Threads deletion status check failed:", error);

    return new NextResponse("Unable to check deletion status", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
