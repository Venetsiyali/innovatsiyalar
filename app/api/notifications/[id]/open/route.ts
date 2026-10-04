import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Mark a notification as read and follow its link (in-app paths only).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  const { id } = await params;
  const n = await db.notification.findFirst({ where: { id, userId: session.user.id, deletedAt: null } });
  if (n && !n.isRead) await db.notification.update({ where: { id }, data: { isRead: true } });
  const target = n?.link?.startsWith("/") && !n.link.startsWith("//") ? n.link : "/notifications";
  return NextResponse.redirect(new URL(target, req.url));
}
