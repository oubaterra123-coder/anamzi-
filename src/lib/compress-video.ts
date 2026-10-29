"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export async function compressVideo(
  file: File,
  onProgress: (percent: number) => void
): Promise<File> {
  const ffmpeg = new FFmpeg();
  let loaded = false;

  try {
    onProgress(0);

    await ffmpeg.load({
      classWorkerURL: "/ffmpeg/814.ffmpeg.js",
      coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
    });
    loaded = true;

    const inputName = "input-video." + (file.name.split(".").pop()?.toLowerCase() || "mp4");
    const outputName = "compressed-video.mp4";

    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    });

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      "-i", inputName,
      "-vf", "scale=min(1280\\,iw):-2",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputName,
    ]);

    const result = await ffmpeg.readFile(outputName);
    if (typeof result === "string") {
      throw new Error("FFmpeg returned an invalid video.");
    }

    const bytes = new Uint8Array(result);
    const output = new File(
      [bytes],
      "compressed-video.mp4",
      { type: "video/mp4", lastModified: Date.now() }
    );

    onProgress(100);
    return output;
  } finally {
    if (loaded) ffmpeg.terminate();
  }
}
