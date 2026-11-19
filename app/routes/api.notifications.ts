import { redirect } from "react-router";
import type { Route } from "./+types/api.notifications";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markCourseNotificationsAsRead,
} from "~/lib/notifications.server";

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const redirectTo = (formData.get("redirectTo") as string) || null;

  if (intent === "mark-as-read") {
    const notificationId = Number(formData.get("notificationId"));
    if (!notificationId) {
      return Response.json({ error: "Missing notificationId" }, { status: 400 });
    }
    markNotificationAsRead(db, notificationId, userId);
  } else if (intent === "mark-all-read") {
    markAllNotificationsAsRead(db, userId);
  } else if (intent === "mark-course-read") {
    const rawCourseId = formData.get("courseId");
    const courseId = rawCourseId === "null" || !rawCourseId ? null : Number(rawCourseId);
    markCourseNotificationsAsRead(db, userId, courseId);
  } else {
    return Response.json({ error: "Invalid intent" }, { status: 400 });
  }

  if (redirectTo) {
    return redirect(redirectTo);
  }

  return Response.json({ success: true });
}
