import { and, desc, eq, isNull, isNotNull, sql } from "drizzle-orm";
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

/**
 * Dispatches notification to course instructor when a student enrolls.
 */
export function notifyStudentEnrolled(
  db: Database,
  params: {
    courseId: number;
    instructorId: number;
    studentId: number;
    studentName: string;
    courseTitle: string;
  }
) {
  return createNotification(db, {
    recipientUserId: params.instructorId,
    actorUserId: params.studentId,
    eventType: NotificationEventType.StudentEnrolled,
    courseId: params.courseId,
    title: "New student enrolled",
    body: `${params.studentName} enrolled in your course '${params.courseTitle}'.`,
    targetUrl: "/instructor",
    metadata: {
      studentId: params.studentId,
    },
  });
}

/**
 * Dispatches notification to course instructor when a student submits or updates a rating.
 */
export function notifyCourseRated(
  db: Database,
  params: {
    courseId: number;
    instructorId: number;
    studentId: number;
    rating: number;
    review?: string | null;
  }
) {
  const bodyText = params.review
    ? params.review.length > 120
      ? params.review.slice(0, 117) + "..."
      : params.review
    : `Student submitted a ${params.rating}-star review.`;

  return createNotification(db, {
    recipientUserId: params.instructorId,
    actorUserId: params.studentId,
    eventType: NotificationEventType.CourseRated,
    courseId: params.courseId,
    title: `New ${params.rating}-star review`,
    body: bodyText,
    targetUrl: "/instructor",
    metadata: {
      rating: params.rating,
      review: params.review ?? null,
    },
  });
}

/**
 * Dispatches notification to all currently active enrolled students when a course is updated.
 * Excludes lapsed students (who no longer have an active enrollment row).
 */
export function notifyCourseUpdated(
  db: Database,
  params: {
    courseId: number;
    courseSlug: string;
    instructorId: number;
    title: string;
    body: string;
  }
): number {
  const activeEnrollments = db
    .select({ userId: schema.enrollments.userId })
    .from(schema.enrollments)
    .where(eq(schema.enrollments.courseId, params.courseId))
    .all();

  let count = 0;
  for (const enrollment of activeEnrollments) {
    const notif = createNotification(db, {
      recipientUserId: enrollment.userId,
      actorUserId: params.instructorId,
      eventType: NotificationEventType.CourseUpdated,
      courseId: params.courseId,
      title: params.title,
      body: params.body,
      targetUrl: `/courses/${params.courseSlug}`,
    });
    if (notif) count++;
  }

  return count;
}

/**
 * Dispatches notification to buyer student when a Refund Request is decided.
 */
export function notifyRefundDecided(
  db: Database,
  params: {
    buyerUserId: number;
    adminUserId?: number | null;
    courseId: number;
    courseSlug: string;
    status: "approved" | "declined";
    decisionNote?: string | null;
  }
) {
  const isApproved = params.status === "approved";
  const title = isApproved
    ? "Refund Request Approved"
    : "Refund Request Declined";

  const body = params.decisionNote?.trim()
    ? params.decisionNote.trim()
    : isApproved
    ? "Your refund request was approved by a Platform Admin."
    : "Your refund request was declined by a Platform Admin.";

  return createNotification(db, {
    recipientUserId: params.buyerUserId,
    actorUserId: params.adminUserId ?? null,
    eventType: NotificationEventType.RefundDecided,
    courseId: params.courseId,
    title,
    body,
    targetUrl: `/courses/${params.courseSlug}`,
    metadata: {
      status: params.status,
      decisionNote: params.decisionNote ?? null,
    },
  });
}

/**
 * Marks all notifications for a given course (or null for platform updates) as read for a user.
 */
export function markCourseNotificationsAsRead(
  db: Database,
  userId: number,
  courseId: number | null
): number {
  const condition =
    courseId === null
      ? and(
          eq(notifications.recipientUserId, userId),
          isNull(notifications.courseId),
          isNull(notifications.readAt)
        )
      : and(
          eq(notifications.recipientUserId, userId),
          eq(notifications.courseId, courseId),
          isNull(notifications.readAt)
        );

  const res = db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(condition)
    .run();

  return res.changes;
}

/**
 * Returns notifications joined with course information for the notifications center.
 */
export function getNotificationsWithCourseForUser(
  db: Database,
  userId: number,
  limit: number = 100
) {
  return db
    .select({
      id: notifications.id,
      recipientUserId: notifications.recipientUserId,
      actorUserId: notifications.actorUserId,
      eventType: notifications.eventType,
      courseId: notifications.courseId,
      courseTitle: schema.courses.title,
      courseSlug: schema.courses.slug,
      title: notifications.title,
      body: notifications.body,
      targetUrl: notifications.targetUrl,
      metadata: notifications.metadata,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(schema.courses, eq(notifications.courseId, schema.courses.id))
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

/**
 * Marks a single notification as unread if it belongs to the given user.
 * Returns true if updated, false otherwise.
 */
export function markNotificationAsUnread(
  db: Database,
  notificationId: number,
  userId: number
): boolean {
  const res = db
    .update(notifications)
    .set({ readAt: null })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientUserId, userId),
        isNotNull(notifications.readAt)
      )
    )
    .run();

  return res.changes > 0;
}
