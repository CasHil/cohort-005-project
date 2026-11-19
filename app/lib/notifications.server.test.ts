import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import {
  createNotification,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationEventType,
} from "./notifications.server";

type TestDb = ReturnType<typeof createTestDb>;

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let student2: typeof schema.users.$inferSelect;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  student2 = db
    .insert(schema.users)
    .values({
      name: "Second Student",
      email: "student2@example.com",
      role: UserRole.Student,
    })
    .returning()
    .get();
});

describe("notifications domain service", () => {
  it("creates a notification with valid payload", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Reply to your discussion",
      body: "Check out this solution",
      targetUrl: `/courses/${base.course.slug}/lessons/1#comment-10`,
      metadata: { commentId: 10 },
    });

    expect(notif).toBeDefined();
    expect(notif?.id).toBeGreaterThan(0);
    expect(notif?.title).toBe("Reply to your discussion");
    expect(notif?.readAt).toBeNull();
  });

  it("enforces actor self-suppression rule (drops notification if actor is recipient)", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.user.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Self reply",
      body: "I replied to myself",
      targetUrl: "/courses/test",
    });

    expect(notif).toBeNull();
    expect(getUnreadNotificationCount(db, base.user.id)).toBe(0);
  });

  it("queries unread notifications count accurately", () => {
    expect(getUnreadNotificationCount(db, base.user.id)).toBe(0);

    createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 1",
      body: "Body 1",
      targetUrl: "/test-1",
    });

    createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 2",
      body: "Body 2",
      targetUrl: "/test-2",
    });

    expect(getUnreadNotificationCount(db, base.user.id)).toBe(2);
    // Isolation: other student has 0
    expect(getUnreadNotificationCount(db, student2.id)).toBe(0);
  });

  it("marks individual notification as read", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 1",
      body: "Body 1",
      targetUrl: "/test-1",
    })!;

    expect(getUnreadNotificationCount(db, base.user.id)).toBe(1);

    const updated = markNotificationAsRead(db, notif.id, base.user.id);
    expect(updated).toBe(true);
    expect(getUnreadNotificationCount(db, base.user.id)).toBe(0);

    const items = getNotificationsForUser(db, base.user.id);
    expect(items[0].readAt).not.toBeNull();
  });

  it("cannot mark someone else's notification as read", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 1",
      body: "Body 1",
      targetUrl: "/test-1",
    })!;

    const updated = markNotificationAsRead(db, notif.id, student2.id);
    expect(updated).toBe(false);
    expect(getUnreadNotificationCount(db, base.user.id)).toBe(1);
  });

  it("marks all notifications for a user as read", () => {
    createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 1",
      body: "Body 1",
      targetUrl: "/test-1",
    });
    createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 2",
      body: "Body 2",
      targetUrl: "/test-2",
    });

    expect(getUnreadNotificationCount(db, base.user.id)).toBe(2);

    markAllNotificationsAsRead(db, base.user.id);

    expect(getUnreadNotificationCount(db, base.user.id)).toBe(0);
  });
});
