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
  notifyCourseUpdated,
  notifyRefundDecided,
  markCourseNotificationsAsRead,
  markNotificationAsUnread,
  NotificationEventType,
} from "./notifications.server";

type TestDb = ReturnType<typeof createTestDb>;

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let student2: typeof schema.users.$inferSelect;
let admin: typeof schema.users.$inferSelect;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  admin = db
    .insert(schema.users)
    .values({
      name: "Admin User",
      email: "admin@example.com",
      role: UserRole.Admin,
    })
    .returning()
    .get();

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

describe("discussion comment notifications (ticket #7)", () => {
  it("triggers lesson_comment_created for the instructor when student posts a top-level comment", () => {
    // When student posts top-level comment
    const notif = createNotification(db, {
      recipientUserId: base.instructor.id,
      actorUserId: base.user.id,
      eventType: NotificationEventType.LessonCommentCreated,
      courseId: base.course.id,
      title: "New question asked",
      body: "How do generic constraints work?",
      targetUrl: `/courses/${base.course.slug}/lessons/1#comment-10`,
      metadata: { lessonId: 1, commentId: 10 },
    });

    expect(notif).not.toBeNull();
    expect(notif?.recipientUserId).toBe(base.instructor.id);
    expect(notif?.eventType).toBe(NotificationEventType.LessonCommentCreated);
    expect(notif?.title).toBe("New question asked");
    expect(notif?.targetUrl).toBe(`/courses/${base.course.slug}/lessons/1#comment-10`);
  });

  it("triggers comment_reply_created for parent author when someone replies", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: student2.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Reply to your discussion",
      body: "You can use satisfies to solve this!",
      targetUrl: `/courses/${base.course.slug}/lessons/1#comment-11`,
      metadata: { lessonId: 1, commentId: 11, parentId: 10 },
    });

    expect(notif).not.toBeNull();
    expect(notif?.recipientUserId).toBe(base.user.id);
    expect(notif?.eventType).toBe(NotificationEventType.CommentReplyCreated);
  });

  it("suppresses self-reply notification when parent author replies to own comment", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.user.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Reply to your discussion",
      body: "Actually never mind, I found it.",
      targetUrl: `/courses/${base.course.slug}/lessons/1#comment-12`,
      metadata: { lessonId: 1, commentId: 12, parentId: 10 },
    });

    expect(notif).toBeNull();
  });
});

describe("enrollment, review & course update notifications (ticket #8)", () => {
  it("triggers student_enrolled notification for instructor when student enrolls", () => {
    const notif = createNotification(db, {
      recipientUserId: base.instructor.id,
      actorUserId: base.user.id,
      eventType: NotificationEventType.StudentEnrolled,
      courseId: base.course.id,
      title: "New student enrolled",
      body: "Test User enrolled in your course 'Introduction to TypeScript'.",
      targetUrl: "/instructor",
      metadata: { studentId: base.user.id },
    });

    expect(notif).not.toBeNull();
    expect(notif?.recipientUserId).toBe(base.instructor.id);
    expect(notif?.eventType).toBe(NotificationEventType.StudentEnrolled);
  });

  it("triggers course_rated notification for instructor when student rates course", () => {
    const notif = createNotification(db, {
      recipientUserId: base.instructor.id,
      actorUserId: base.user.id,
      eventType: NotificationEventType.CourseRated,
      courseId: base.course.id,
      title: "New 5-star review",
      body: "Great course! Learned a lot.",
      targetUrl: "/instructor",
      metadata: { rating: 5 },
    });

    expect(notif).not.toBeNull();
    expect(notif?.recipientUserId).toBe(base.instructor.id);
    expect(notif?.eventType).toBe(NotificationEventType.CourseRated);
  });

  it("notifies only active enrolled students and excludes lapsed students on course_updated", () => {
    // base.user is enrolled
    db.insert(schema.enrollments)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
      })
      .run();

    // student2 has no enrollment (or had enrollment revoked/lapsed)

    const notifiedCount = notifyCourseUpdated(db, {
      courseId: base.course.id,
      courseSlug: base.course.slug,
      instructorId: base.instructor.id,
      title: "Course update published",
      body: "Added a new bonus lesson on generic types.",
    });

    expect(notifiedCount).toBe(1);

    const student1Notifs = getNotificationsForUser(db, base.user.id);
    expect(student1Notifs.length).toBe(1);
    expect(student1Notifs[0].eventType).toBe(NotificationEventType.CourseUpdated);

    const student2Notifs = getNotificationsForUser(db, student2.id);
    expect(student2Notifs.length).toBe(0);
  });
});

describe("refund decision notifications (ticket #9)", () => {
  it("triggers refund_decided notification for buyer student when refund is approved", () => {
    const notif = notifyRefundDecided(db, {
      buyerUserId: base.user.id,
      adminUserId: admin.id,
      courseId: base.course.id,
      courseSlug: base.course.slug,
      status: "approved",
      decisionNote: "Full refund granted per guarantee.",
    });

    expect(notif).not.toBeNull();
    expect(notif?.recipientUserId).toBe(base.user.id);
    expect(notif?.actorUserId).toBe(admin.id);
    expect(notif?.eventType).toBe(NotificationEventType.RefundDecided);
    expect(notif?.title).toBe("Refund Request Approved");
    expect(notif?.body).toContain("Full refund granted");
    expect(notif?.targetUrl).toBe(`/courses/${base.course.slug}`);
  });

  it("triggers refund_decided notification for buyer student when refund is declined", () => {
    const notif = notifyRefundDecided(db, {
      buyerUserId: base.user.id,
      adminUserId: admin.id,
      courseId: base.course.id,
      courseSlug: base.course.slug,
      status: "declined",
      decisionNote: "More than 14 days passed since purchase.",
    });

    expect(notif).not.toBeNull();
    expect(notif?.recipientUserId).toBe(base.user.id);
    expect(notif?.eventType).toBe(NotificationEventType.RefundDecided);
    expect(notif?.title).toBe("Refund Request Declined");
    expect(notif?.body).toContain("More than 14 days passed");
  });

  it("suppresses notification if platform admin is acting on their own purchase", () => {
    const notif = notifyRefundDecided(db, {
      buyerUserId: base.user.id,
      adminUserId: base.user.id,
      courseId: base.course.id,
      courseSlug: base.course.slug,
      status: "approved",
      decisionNote: "Self approved",
    });

    expect(notif).toBeNull();
  });
});

describe("course notifications query & mark course read (ticket #10)", () => {
  it("marks all notifications for a specific course as read", () => {
    // Notification for course 1
    const notif1 = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Course 1 Notif",
      body: "Course 1 Body",
      targetUrl: "/courses/1",
    });

    // Notification without course (platform)
    const notif2 = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: null,
      eventType: NotificationEventType.RefundDecided,
      courseId: null,
      title: "Platform Notif",
      body: "Platform Body",
      targetUrl: "/account",
    });

    expect(getUnreadNotificationCount(db, base.user.id)).toBe(2);

    const updated = markCourseNotificationsAsRead(db, base.user.id, base.course.id);
    expect(updated).toBe(1);

    expect(getUnreadNotificationCount(db, base.user.id)).toBe(1);

    // Platform notif still unread
    const notifs = getNotificationsForUser(db, base.user.id);
    const platform = notifs.find((n) => n.id === notif2?.id);
    expect(platform?.readAt).toBeNull();
  });
});

describe("mark as unread toggle", () => {
  it("toggles read status back to unread", () => {
    const notif = createNotification(db, {
      recipientUserId: base.user.id,
      actorUserId: base.instructor.id,
      eventType: NotificationEventType.CommentReplyCreated,
      courseId: base.course.id,
      title: "Notif 1",
      body: "Body 1",
      targetUrl: "/test-1",
    })!;

    markNotificationAsRead(db, notif.id, base.user.id);
    expect(getUnreadNotificationCount(db, base.user.id)).toBe(0);

    const toggled = markNotificationAsUnread(db, notif.id, base.user.id);
    expect(toggled).toBe(true);
    expect(getUnreadNotificationCount(db, base.user.id)).toBe(1);

    const notifs = getNotificationsForUser(db, base.user.id);
    expect(notifs[0].readAt).toBeNull();
  });
});
