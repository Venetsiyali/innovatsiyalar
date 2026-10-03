import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageCourse } from "@/lib/course-access";
import { checkFile, MAX_VIDEO_SIZE, MIME_BY_EXT, maxSizeFor } from "@/lib/files";
import { t } from "@/lib/i18n";
import { coursePrefix } from "@/lib/storage";

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
        const { courseId } = JSON.parse(clientPayload ?? "{}") as { courseId?: string };
        if (!courseId || !(await canManageCourse(session.user, courseId))) throw new Error(t("errors.forbidden"));
        if (!pathname.startsWith(coursePrefix(courseId))) throw new Error(t("errors.forbidden"));
        // Size is enforced by Blob via maximumSizeInBytes; here only the extension matters.
        const problem = checkFile(pathname, 0);
        if (problem) throw new Error(t(problem));
        return {
          allowedContentTypes: [...new Set(Object.values(MIME_BY_EXT))],
          maximumSizeInBytes: Math.min(maxSizeFor(pathname), MAX_VIDEO_SIZE),
          addRandomSuffix: true,
        };
      },
      // The material row is created by addFileMaterialAction after the browser finishes,
      // so nothing to do here (this webhook can't reach localhost anyway).
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
