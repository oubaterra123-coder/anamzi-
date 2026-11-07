import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptThreadsToken } from "@/lib/threads/security";

export const maxDuration = 60;

const GRAPH = "https://graph.threads.net/v1.0";

async function metaPost(url: string, values: Record<string, string>, token: string) {
  const body = new URLSearchParams({ ...values, access_token: token });
  console.log("THREADS META POST:", url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(JSON.stringify(data.error) || "Threads API request failed");
  }
  return data;
}

async function markFailed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  attempts: number,
  error: string
) {
  const delay = Math.min(60, 5 * 2 ** Math.max(0, attempts - 1));
  await supabase.from("social_publications").update({
    status: "failed",
    last_error: error.slice(0, 1000),
    next_attempt_at: new Date(Date.now() + delay * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: jobs, error: claimError } = await supabase.rpc(
    "claim_next_threads_publication"
  );

  if (claimError) {
    console.error("Threads queue claim failed:", claimError.message);
    return NextResponse.json({ error: "Queue unavailable" }, { status: 500 });
  }

  const job = jobs?.[0];
  if (!job) {
    return NextResponse.json({ success: true, message: "Queue empty" });
  }

  const id = job.publication_id as string;
  const productId = job.product_id as string;
  const attempts = Number(job.attempts);

  try {
    const [{ data: product, error: productError }, { data: connection, error: connectionError }] =
      await Promise.all([
        supabase.from("products")
          .select("id,title,description,image_url,video_url,status")
          .eq("id", productId)
          .maybeSingle(),
        supabase.from("threads_connections")
          .select("threads_user_id,access_token_encrypted,token_expires_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (productError) throw productError;
    if (!product || product.status !== "approved") {
      await supabase.from("social_publications").update({
        status: "skipped",
        last_error: "Product is not approved",
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      return NextResponse.json({ success: true, status: "skipped" });
    }

    if (connectionError) throw connectionError;
    if (!connection) throw new Error("No Threads account connected");

    if (new Date(connection.token_expires_at).getTime() <= Date.now()) {
      throw new Error("Threads token expired; reconnect the account");
    }

    const token = decryptThreadsToken(connection.access_token_encrypted);
    const caption = [product.title, product.description]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 500);

    let containerId: string | null = null;

    const { data: publication, error: publicationError } = await supabase
      .from("social_publications")
      .select("container_id")
      .eq("id", id)
      .single();

    if (publicationError) throw publicationError;
    containerId = publication.container_id;

    if (!containerId) {
      let mediaType: "IMAGE" | "VIDEO";
      let mediaUrl: string;

      if (product.video_url) {
        mediaType = "VIDEO";
        mediaUrl = /^https?:\/\//i.test(product.video_url)
          ? product.video_url
          : supabase.storage.from("products").getPublicUrl(product.video_url).data.publicUrl;
      } else if (product.image_url) {
        mediaType = "IMAGE";

        const sourceUrl = /^https?:\/\//i.test(product.image_url)
          ? product.image_url
          : supabase.storage.from("products").getPublicUrl(product.image_url).data.publicUrl;

        const source = await fetch(sourceUrl, { cache: "no-store" });
        if (!source.ok) throw new Error("Could not download product image");

        const input = Buffer.from(await source.arrayBuffer());
        const jpeg = await sharp(input).rotate().jpeg({ quality: 88 }).toBuffer();

        const imagePath = `threads-publishing/${productId}/${id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(imagePath, jpeg, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        mediaUrl = supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl;
      } else {
        throw new Error("Product has no image or video");
      }

      const created = await metaPost(
        `${GRAPH}/${connection.threads_user_id}/threads`,
        {
          media_type: mediaType,
          text: caption,
          [mediaType === "VIDEO" ? "video_url" : "image_url"]: mediaUrl,
        },
        token
      );

      containerId = String(created.id);

      const { error: saveError } = await supabase
        .from("social_publications")
        .update({
          container_id: containerId,
          next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (saveError) throw saveError;

      return NextResponse.json({
        success: true,
        status: "processing",
        mediaType,
      });
    }

    console.log("THREADS META STATUS:", containerId);
    const statusResponse = await fetch(
      `${GRAPH}/${containerId}?fields=status,error_message&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const containerStatus = await statusResponse.json();

    if (!statusResponse.ok || containerStatus.error) {
      throw new Error(JSON.stringify(containerStatus.error) || "Could not check media status");
    }

    if (containerStatus.status === "IN_PROGRESS") {
      await supabase.from("social_publications").update({
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      return NextResponse.json({ success: true, status: "processing" });
    }

    if (containerStatus.status === "ERROR" || containerStatus.status === "EXPIRED") {
      await supabase.from("social_publications").update({
        status: "failed",
        container_id: null,
        last_error: containerStatus.error_message || containerStatus.status,
        next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      return NextResponse.json({ success: false, status: "failed" });
    }

    if (containerStatus.status === "PUBLISHED") {
      const { error: doneError } = await supabase.from("social_publications")
        .update({
          status: "published",
          external_post_id: containerId,
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", id);

      if (doneError) throw doneError;
      return NextResponse.json({ success: true, status: "published" });
    }

    if (containerStatus.status !== "FINISHED") {
      throw new Error(`Unexpected container status: ${containerStatus.status}`);
    }

    const published = await metaPost(
      `${GRAPH}/${connection.threads_user_id}/threads_publish`,
      { creation_id: containerId },
      token
    );

    const mediaId = String(published.id);

    let publishedUrl: string | null = null;
    try {
      const permalinkResponse = await fetch(
        `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      if (permalinkResponse.ok) {
        const permalinkData = await permalinkResponse.json();
        publishedUrl = permalinkData.permalink || null;
      }
    } catch {
      // Publishing succeeded; permalink lookup is optional.
    }

    const { error: doneError } = await supabase.from("social_publications")
      .update({
        status: "published",
        external_post_id: mediaId,
        published_url: publishedUrl,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

    if (doneError) throw doneError;

    return NextResponse.json({
      success: true,
      status: "published",
      mediaId,
      publishedUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
    console.error("Threads publishing failed:", error);
    await markFailed(supabase, id, attempts, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


