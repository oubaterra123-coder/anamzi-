import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptThreadsToken } from "@/lib/threads/security";


function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  response.cookies.set("anamzi_threads_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/threads/callback",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");
  const savedState = request.cookies.get("anamzi_threads_oauth_state")?.value;

  if (params.get("error")) {
    return jsonResponse({ error: "Threads authorization was cancelled or denied" }, 400);
  }

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return jsonResponse({ error: "Invalid or expired OAuth state" }, 400);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return jsonResponse({ error: "Threads OAuth environment variables are missing" }, 500);
  }

  try {
    const shortUrl = new URL("https://graph.threads.net/oauth/access_token");
    shortUrl.searchParams.set("client_id", appId);
    shortUrl.searchParams.set("client_secret", appSecret);
    shortUrl.searchParams.set("code", code);
    shortUrl.searchParams.set("grant_type", "authorization_code");
    shortUrl.searchParams.set("redirect_uri", redirectUri);

    const shortResponse = await fetch(shortUrl, {
      method: "POST",
      cache: "no-store",
    });

    const shortToken = await shortResponse.json();

    if (!shortResponse.ok || !shortToken.access_token || !shortToken.user_id) {
      throw new Error("Threads short-lived token exchange failed");
    }

    const longUrl = new URL("https://graph.threads.net/access_token");
    longUrl.searchParams.set("grant_type", "th_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);

    const longResponse = await fetch(longUrl, {
      headers: { Authorization: `Bearer ${shortToken.access_token}` },
      cache: "no-store",
    });

    const longToken = await longResponse.json();

    if (!longResponse.ok || !longToken.access_token) {
      throw new Error("Threads long-lived token exchange failed");
    }

    const profileResponse = await fetch(
      "https://graph.threads.net/v1.0/me?fields=id,username",
      {
        headers: { Authorization: `Bearer ${longToken.access_token}` },
        cache: "no-store",
      }
    );

    const threadsProfile = await profileResponse.json();

    if (!profileResponse.ok || !threadsProfile.id) {
      throw new Error("Could not verify Threads profile");
    }

    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + Number(longToken.expires_in) * 1000).toISOString()
      : null;

    const admin = createSupabaseAdminClient();
    const { error: saveError } = await admin
      .from("threads_connections")
      .upsert(
        {
          threads_user_id: String(threadsProfile.id),
          username: threadsProfile.username ?? null,
          access_token_encrypted: encryptThreadsToken(longToken.access_token),
          token_expires_at: expiresAt,
          scopes: ["threads_basic", "threads_content_publish"],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "threads_user_id" }
      );

    if (saveError) {
      throw new Error("Could not save Threads connection");
    }

    return jsonResponse({
      connected: true,
      username: threadsProfile.username ?? null,
    });
  } catch (error) {
    console.error("Threads OAuth callback failed:", error);
    return jsonResponse({
      error: "Threads connection could not be completed. Check server logs.",
    }, 502);
  }
}


