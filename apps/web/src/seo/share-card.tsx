import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { site } from "@starsagitarian/shared";

/** The size every link preview uses (LinkedIn, WhatsApp, Slack, X...). */
export const SHARE_SIZE = { width: 1200, height: 630 };
export const SHARE_TYPE = "image/jpeg";

const dataUrl = (bytes: Buffer, type: string) => `data:${type};base64,${bytes.toString("base64")}`;

interface Assets {
  painting: string;
  figure: string;
  emblem: string;
  medium: Buffer;
  bold: Buffer;
}
let assets: Promise<Assets> | undefined;

/**
 * The night painting and Baiju standing (prepared by `npm run icons`, see scripts/icons.mjs),
 * the emblem and the two weights of Lexend, read once.
 */
function loadAssets(): Promise<Assets> {
  assets ??= (async () => {
    // each path spelled out, so the build traces these five files and not the whole project
    const app = process.cwd();
    const [painting, figure, emblem, medium, bold] = await Promise.all([
      readFile(path.join(app, "assets", "share", "painting.jpg")),
      readFile(path.join(app, "assets", "share", "figure.png")),
      readFile(path.join(app, "public", "icons", "icon-192.png")),
      readFile(path.join(app, "assets", "fonts", "lexend-latin-500-normal.woff")),
      readFile(path.join(app, "assets", "fonts", "lexend-latin-700-normal.woff")),
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

/**
 * sharp, where it is installed: at build, where every card is drawn. The server image leaves it
 * out (it is the largest library there), so a card drawn later, for a project added after a
 * deploy, is sent as the PNG it was rendered as.
 */
const loadSharp = () =>
  import("sharp").then(
    (module) => module.default,
    () => null,
  );

/** Shortens text to whole words, with an ellipsis, so it fits the card. */
const fit = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(" ", max - 1))}…`;

/**
 * A link preview: the night painting, Baiju standing on the right, and on the left his name,
 * the page's kicker, title and a line about it. Rendered once at build, then saved as a JPEG of
 * well under 300 KB, which WhatsApp needs before it shows an image at all.
 */
async function drawCard(
  kicker: string | undefined,
  title: string,
  lede: string,
): Promise<{ bytes: Uint8Array; type: string }> {
  "use cache";
  cacheLife("max");
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
  const sharp = await loadSharp();
  if (sharp === null) {
    return { bytes: new Uint8Array(await png.arrayBuffer()), type: "image/png" };
  }
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return { bytes: new Uint8Array(jpeg), type: SHARE_TYPE };
}

/**
 * A link preview as a response. Drawn once (cached, so the build prepares every card ahead) and
 * saved as a JPEG of well under 300 KB, which WhatsApp needs before it shows an image at all.
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
  const { bytes, type } = await drawCard(kicker, title, lede);
  return new Response(bytes as BodyInit, {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" },
  });
}
