import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { site } from "@starsagitarian/shared";

/** The size every link preview uses (LinkedIn, WhatsApp, Slack, X...). */
export const SHARE_SIZE = { width: 1200, height: 630 };
export const SHARE_TYPE = "image/jpeg";

const fromApp = (file: string) => readFile(path.join(process.cwd(), file));
const dataUrl = (bytes: Buffer, type: string) => `data:${type};base64,${bytes.toString("base64")}`;

interface Assets {
  painting: string;
  figure: string;
  emblem: string;
  medium: Buffer;
  bold: Buffer;
}
let assets: Promise<Assets> | undefined;

/** The night painting, the standing figure, the emblem and the two weights of Lexend, once. */
function loadAssets(): Promise<Assets> {
  assets ??= (async () => {
    const [painting, figure, emblem, medium, bold] = await Promise.all([
      fromApp("public/art/scene/night-1920.webp").then((bytes) =>
        sharp(bytes)
          .resize(SHARE_SIZE.width, SHARE_SIZE.height, { fit: "cover" })
          .jpeg()
          .toBuffer(),
      ),
      fromApp("public/art/character-standing-579.webp").then((bytes) =>
        sharp(bytes).resize({ height: 620 }).png().toBuffer(),
      ),
      fromApp("public/icons/icon-192.png"),
      fromApp("assets/fonts/lexend-latin-500-normal.woff"),
      fromApp("assets/fonts/lexend-latin-700-normal.woff"),
    ]);
    return {
      painting: dataUrl(painting, "image/jpeg"),
      figure: dataUrl(figure, "image/png"),
      emblem: dataUrl(emblem, "image/png"),
      medium,
      bold,
    };
  })();
  return assets;
}

/** Shortens text to whole words, with an ellipsis, so it fits the card. */
const fit = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(" ", max - 1))}…`;

/**
 * A link preview: the night painting, Baiju standing on the right, and on the left his name,
 * the page's kicker, title and a line about it. Rendered once at build, then saved as a JPEG of
 * well under 300 KB, which WhatsApp needs before it shows an image at all.
 */
export async function shareCard({
  kicker,
  title,
  lede,
}: {
  kicker?: string | undefined;
  title: string;
  lede: string;
}): Promise<Response> {
  const a = await loadAssets();
  const png = new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        color: "#ffffff",
        fontFamily: "Lexend",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image, not a page */}
      <img
        src={a.painting}
        width={SHARE_SIZE.width}
        height={SHARE_SIZE.height}
        alt=""
        style={{ position: "absolute", left: 0, top: 0 }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 920,
          height: SHARE_SIZE.height,
          backgroundImage:
            "linear-gradient(90deg, rgba(7,12,36,0.92) 0%, rgba(7,12,36,0.82) 68%, rgba(7,12,36,0) 100%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image, not a page */}
      <img
        src={a.figure}
        height={620}
        alt=""
        style={{ position: "absolute", right: 64, bottom: -24 }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 60,
          bottom: 56,
          width: 690,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image, not a page */}
          <img src={a.emblem} width={68} height={68} alt="" style={{ borderRadius: 34 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{site.name}</span>
            <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: 4, color: "#f2cf86" }}>
              {site.title.toUpperCase()}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {kicker !== undefined && (
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#e7a83b" }}>
              {kicker.toUpperCase()}
            </span>
          )}
          <span
            style={{
              marginTop: 10,
              fontSize: title.length > 26 ? 60 : 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {fit(title, 60)}
          </span>
          <span style={{ marginTop: 22, fontSize: 28, lineHeight: 1.4, color: "#e6eaf7" }}>
            {fit(lede, 130)}
          </span>
        </div>
        <span style={{ fontSize: 22, color: "#c9d1ec" }}>{new URL(site.url).host}</span>
      </div>
    </div>,
    {
      ...SHARE_SIZE,
      fonts: [
        { name: "Lexend", data: a.medium, weight: 500, style: "normal" },
        { name: "Lexend", data: a.bold, weight: 700, style: "normal" },
      ],
    },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": SHARE_TYPE, "Cache-Control": "public, max-age=3600" },
  });
}
