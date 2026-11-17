export type NotificationType =
  | "comment_reply"
  | "instructor_question"
  | "course_announcement"
  | "course_rating"
  | "student_enrollment"
  | "refund_request";

export interface MockNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  targetRole: "student" | "instructor" | "both";
  courseTitle: string;
  courseSlug: string;
  lessonTitle?: string;
  actionUrl: string;
  createdAt: string; // relative timestamp label
  isRead: boolean;
  avatarUrl?: string;
  actorName: string;
}

export const INITIAL_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif-1",
    type: "instructor_question",
    title: "New question asked",
    body: "Marcus Vance asked a question on Lesson 3: 'How do transitions interact with parallel routes?'",
    targetRole: "instructor",
    courseTitle: "Full-Stack React Router",
    courseSlug: "full-stack-react-router",
    lessonTitle: "Nested Routes & Parallel Outlets",
    actionUrl: "/instructor/questions",
    createdAt: "10m ago",
    isRead: false,
    actorName: "Marcus Vance",
  },
  {
    id: "notif-2",
    type: "comment_reply",
    title: "Reply to your discussion",
    body: "Sarah Connor replied: 'You can pass clientLoader alongside serverLoader for instant cache invalidation!'",
    targetRole: "student",
    courseTitle: "Full-Stack React Router",
    courseSlug: "full-stack-react-router",
    lessonTitle: "Client-side caching strategies",
    actionUrl: "/courses/full-stack-react-router",
    createdAt: "25m ago",
    isRead: false,
    actorName: "Sarah Connor",
  },
  {
    id: "notif-3",
    type: "student_enrollment",
    title: "New student enrolled",
    body: "Alex Rivera enrolled in your course 'Advanced TypeScript Patterns'.",
    targetRole: "instructor",
    courseTitle: "Advanced TypeScript Patterns",
    courseSlug: "advanced-typescript-patterns",
    actionUrl: "/instructor/analytics",
    createdAt: "2h ago",
    isRead: false,
    actorName: "Alex Rivera",
  },
  {
    id: "notif-4",
    type: "course_rating",
    title: "New 5-star review",
    body: "Elena Rostova left a 5-star review: 'Outstanding clarity on generics and conditional inference!'",
    targetRole: "instructor",
    courseTitle: "Advanced TypeScript Patterns",
    courseSlug: "advanced-typescript-patterns",
    actionUrl: "/instructor",
    createdAt: "5h ago",
    isRead: true,
    actorName: "Elena Rostova",
  },
  {
    id: "notif-5",
    type: "course_announcement",
    title: "Course update published",
    body: "Matt Pocock published 2 new bonus lessons: 'Strict Template Literal Types' and exercises.",
    targetRole: "student",
    courseTitle: "Advanced TypeScript Patterns",
    courseSlug: "advanced-typescript-patterns",
    actionUrl: "/courses/advanced-typescript-patterns",
    createdAt: "1d ago",
    isRead: true,
    actorName: "Matt Pocock",
  },
  {
    id: "notif-6",
    type: "refund_request",
    title: "Refund request initiated",
    body: "Student David Kim requested a refund for 'Zero-to-Hero Tailwind CSS'. Reason: 'Accidental team purchase'.",
    targetRole: "instructor",
    courseTitle: "Zero-to-Hero Tailwind CSS",
    courseSlug: "zero-to-hero-tailwind-css",
    actionUrl: "/instructor",
    createdAt: "2d ago",
    isRead: true,
    actorName: "David Kim",
  },
  {
    id: "notif-7",
    type: "comment_reply",
    title: "Upvoted and marked as solution",
    body: "Instructor approved your answer as the accepted solution in Community Q&A.",
    targetRole: "student",
    courseTitle: "Full-Stack React Router",
    courseSlug: "full-stack-react-router",
    actionUrl: "/courses/full-stack-react-router",
    createdAt: "3d ago",
    isRead: true,
    actorName: "Matt Pocock",
  },
];
