import { redirect, data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/api.notifications";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import {
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  markCourseNotificationsAsRead,
} from "~/lib/notifications.server";

const notificationActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("mark-as-read"),
    notificationId: z.coerce.number().int().positive(),
    redirectTo: z.string().optional(),
  }),
  z.object({
    intent: z.literal("mark-as-unread"),
    notificationId: z.coerce.number().int().positive(),
    redirectTo: z.string().optional(),
  }),
  z.object({
    intent: z.literal("mark-all-read"),
    redirectTo: z.string().optional(),
  }),
  z.object({
    intent: z.literal("mark-course-read"),
    courseId: z
      .string()
      .optional()
      .transform((val) => (val === "null" || !val ? null : Number(val))),
    redirectTo: z.string().optional(),
  }),
]);

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    throw data("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const rawData = Object.fromEntries(formData.entries());

  const parsed = notificationActionSchema.safeParse(rawData);
  if (!parsed.success) {
    throw data("Invalid request parameters", { status: 400 });
  }

  const payload = parsed.data;

  switch (payload.intent) {
    case "mark-as-read":
      markNotificationAsRead(db, payload.notificationId, userId);
      break;
    case "mark-as-unread":
      markNotificationAsUnread(db, payload.notificationId, userId);
      break;
    case "mark-all-read":
      markAllNotificationsAsRead(db, userId);
      break;
    case "mark-course-read":
      markCourseNotificationsAsRead(db, userId, payload.courseId);
      break;
  }

  if (payload.redirectTo) {
    throw redirect(payload.redirectTo);
  }

  return { success: true };
}
