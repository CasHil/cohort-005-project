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

/**
 * Dispatches notification for a newly created lesson comment or reply.
 */
export function notifyCommentCreated(
  db: Database,
  params: {
    commentId: number;
    userId: number;
    lessonId: number;
    parentId: number | null;
    body: string;
    courseSlug: string;
    courseId: number;
    instructorId: number;
    parentCommentAuthorId?: number | null;
  }
) {
  const snippet =
    params.body.length > 120
      ? params.body.slice(0, 117) + "..."
      : params.body;

  const targetUrl = `/courses/${params.courseSlug}/lessons/${params.lessonId}#comment-${params.commentId}`;

  if (params.parentId === null) {
    // Top-level comment -> notify instructor
    return createNotification(db, {
      recipientUserId: params.instructorId,
      actorUserId: params.userId,
      eventType: NotificationEventType.LessonCommentCreated,
      courseId: params.courseId,
      title: "New question asked",
      body: snippet,
      targetUrl,
      metadata: {
        lessonId: params.lessonId,
        commentId: params.commentId,
      },
    });
  } else if (params.parentCommentAuthorId) {
    // Reply -> notify author of parent comment (with actor self-suppression)
    return createNotification(db, {
      recipientUserId: params.parentCommentAuthorId,
      actorUserId: params.userId,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: params.courseId,
      title: "Reply to your discussion",
      body: snippet,
      targetUrl,
      metadata: {
        lessonId: params.lessonId,
        commentId: params.commentId,
        parentId: params.parentId,
      },
    });
  }

  return null;
}
