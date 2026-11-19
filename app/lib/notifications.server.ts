import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { NotificationEventType, notifications } from "~/db/schema";

export { NotificationEventType };

type Database = BetterSQLite3Database<typeof schema>;

export interface CreateNotificationInput {
  recipientUserId: number;
  actorUserId?: number | null;
  eventType: NotificationEventType;
  courseId?: number | null;
  title: string;
  body: string;
  targetUrl: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Creates a notification record in the database.
 * Enforces actor self-suppression: if actorUserId === recipientUserId, returns null without inserting.
 */
export function createNotification(
  db: Database,
  input: CreateNotificationInput
) {
  if (input.actorUserId && input.actorUserId === input.recipientUserId) {
    return null;
  }

  return db
    .insert(notifications)
    .values({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      courseId: input.courseId ?? null,
      title: input.title,
      body: input.body,
      targetUrl: input.targetUrl,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      readAt: null,
    })
    .returning()
    .get();
}

/**
 * Returns the count of unread notifications for a given user.
 */
export function getUnreadNotificationCount(
  db: Database,
  userId: number
): number {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt)
      )
    )
    .get();

  return result?.count ?? 0;
}

/**
 * Returns notifications for a user, sorted newest first.
 */
export function getNotificationsForUser(
  db: Database,
  userId: number,
  limit: number = 50
) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

/**
 * Marks a single notification as read if it belongs to the given user.
 * Returns true if updated, false otherwise.
 */
export function markNotificationAsRead(
  db: Database,
  notificationId: number,
  userId: number
): boolean {
  const res = db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt)
      )
    )
    .run();

  return res.changes > 0;
}

/**
 * Marks all unread notifications for a given user as read.
 */
export function markAllNotificationsAsRead(
  db: Database,
  userId: number
): number {
  const res = db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt)
      )
    )
    .run();

  return res.changes;
}
