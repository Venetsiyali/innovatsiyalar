import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MIME_BY_EXT, maxSizeFor } from "@/lib/files";
import { t } from "@/lib/i18n";
import { authorizeUpload, type UploadPayload } from "@/lib/upload-auth";

// Token handshake for direct browser → Vercel Blob uploads (bypasses the 4.5 MB function body limit).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user) throw new Error(t("errors.unauthorized"));
        const error = await authorizeUpload(session.user, pathname, JSON.parse(clientPayload ?? "{}") as UploadPayload);
        if (error) throw new Error(error);
        return {
          allowedContentTypes: [...new Set(Object.values(MIME_BY_EXT))],
          maximumSizeInBytes: maxSizeFor(pathname),
          addRandomSuffix: true,
        };
      },
      // DB rows are written by server actions after the browser finishes (this webhook can't reach localhost).
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
