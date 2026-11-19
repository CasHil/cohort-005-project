# Product Requirements Document: In-App Notifications System for Cadence

**Status**: Ratified / Ready for Implementation  
**Map**: [Map: In-App Notifications Spec (Issue #1)](https://github.com/CasHil/cohort-005-project/issues/1)  
**Parent Decision Tickets**:
- UI Prototype: [Issue #2](https://github.com/CasHil/cohort-005-project/issues/2) (Branch: `prototype/in-app-notifications`, commit `1498856`)
- Domain Events Taxonomy & Rules: [Issue #3](https://github.com/CasHil/cohort-005-project/issues/3)
- Compilation & Ratification: [Issue #4](https://github.com/CasHil/cohort-005-project/issues/4)

---

## 1. Executive Summary & Objectives

Cadence is a video course platform serving **Students** and **Instructors**. As discussion engagement, course updates, and transaction lifecycle events happen, users need prompt, contextual feedback without needing to poll or reload pages.

This PRD establishes the canonical specification for the MVP In-App Notification System:
1. **User Experience & Interaction Patterns**: A universal header affordance (classic bell icon + unread count badge + popover dropdown) for lightweight notifications and quick actions, combined with a dedicated notification center (`/notifications`) organized as a course-grouped bento grid for contextual clarity across multi-course enrollments and instructor cohorts.
2. **Domain Event Taxonomy & Trigger Rules**: A standardized set of 6 notification event types across Student and Instructor roles with strict actor self-suppression, audience isolation, and lifecycle-aware delivery.
3. **Data Model & Schema**: A resilient database model and index strategy in SQLite / Drizzle ORM storing recipient references, optional actors and courses, structured headlines, markdown/text snippets, deep-link target URLs, and extensible metadata JSON.
4. **Architectural Extensibility**: Clean separation between domain event dispatch and delivery channels, enabling future notification delivery (e.g., transactional emails, push notifications) without re-engineering the core domain logic.

---

## 2. Terminology & Glossary Alignment

In adherence to [GLOSSARY.md](file:///Users/casperhildebrand/Developer/repos/cohort-005-project/GLOSSARY.md):
- **Student**: Someone taking courses on Cadence. (Never *Learner* or *User*).
- **Instructor**: A person who builds and owns courses, and sees the Students enrolled on them. (Never *Teacher*, *Author*, or *Creator*).
- **Platform Admin**: A staff member who runs the platform and decides Refund Requests.
- **Team Admin**: A Student who purchases and manages a Team Licence.
- **Enrollment**: A Student's place on a course.
- **Lapsed**: A Student who has lost their Enrollment on a course (e.g. through an Approved Refund Request).
- **Purchase**: An Individual Purchase or Team Licence.
- **Refund Request**: An ask to get back money paid for a Purchase; either Open, Approved, or Declined.

---

## 3. User Experience & Interface Specifications

Based on the ratified decision in [Issue #2](https://github.com/CasHil/cohort-005-project/issues/2), the user interface consists of two synchronized surfaces:

### 3.1 Global Header Affordance: Variant A (Classic Bell + Count Badge + Popover)
- **Location**: Top navigation bar, visible to authenticated Students and Instructors on all desktop and mobile pages.
- **Trigger Element**:
  - Unfussy bell icon with a static unread count badge (e.g. `3`).
  - If unread count is `0`, the badge is hidden or subdued.
  - No pulsating animations or disruptive layout shifts.
- **Popover Dropdown**:
  - Clicking the bell opens a compact popover menu (max height ~400px with smooth scrolling).
  - Shows the most recent 5–10 notifications in chronological order.
  - Each item displays:
    - Event category icon (e.g., discussion reply, review star, refund decision).
    - Title and truncated content body snippet.
    - Timestamp (relative, e.g. "5m ago", "2h ago").
    - Unread indicator dot.
    - Single-click action to mark as read without navigating away.
  - Header of popover provides a "Mark all as read" button.
  - Footer of popover provides a direct navigation link: "View all notifications" (`/notifications`).

### 3.2 Dedicated Notification Center (`/notifications`): Variant C (Course-Grouped Bento Grid)
- **Layout**: Universal default for both Instructors and Students.
- **Rationale**: Linear chronological feeds become an overwhelming firehose for instructors managing multiple courses, and course-grouping gives students clean contextual scoping per enrolled course.
- **Structure**:
  - **Top Action Bar**:
    - Filter tabs / chips: `All`, `Unread`, `Discussions`, `Administrative / Course Updates`.
    - Bulk action button: `Mark all as read`.
    - Unread counters summary.
  - **Bento Grid Cards**:
    - Each course with active or recent notifications is grouped into an isolated Bento card.
    - **Header**: Course Title, total alerts count, course unread badge, and quick action to "Mark course notifications as read".
    - **Body**: Chronological list of notifications scoped strictly to that course.
    - **General / Platform Activity Card**: Any notifications not tied to a specific course (e.g., general account/admin announcements or cross-course refund notices) render in a dedicated "Platform Updates" card.
  - **Item Interactions**:
    - Clicking a notification navigates directly to the deep-linked anchor (e.g. `target_url` like `/courses/ts-patterns/lessons/12#comment-456`) and simultaneously marks the notification as read.
    - Inline toggle button to mark as read / unread.

---

## 4. Domain Event Taxonomy & Notification Triggers

Settled and ratified in [Issue #3](https://github.com/CasHil/cohort-005-project/issues/3), the MVP consists of 6 primary domain events:

### 4.1 Student-Facing Events

| Event Type | Trigger Condition | Recipient | Title | Body Snippet | Target URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `comment_reply_created` | Another user (Instructor or peer Student) replies to a comment authored by the Student. | Author of parent comment (`parent.userId`) | `"Reply to your discussion"` | Truncated snippet of the reply text. | `/courses/<course-slug>/lessons/<lesson-id>#comment-<comment-id>` |
| `refund_decided` | A Platform Admin approves or declines an open Refund Request. | Buyer Student of the Purchase (`purchase.userId`) | `"Refund Request Approved"` or `"Refund Request Declined"` | Platform Admin's reason or decision summary note. | `/courses/<course-slug>` (or refund status page) |
| `course_updated` | Course Instructor publishes a new lesson or major material update. | All active Students enrolled in the course | `"Course update published"` | Name of added lesson or announcement note. | `/courses/<course-slug>` |

### 4.2 Instructor-Facing Events

| Event Type | Trigger Condition | Recipient | Title | Body Snippet | Target URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lesson_comment_created` | A Student posts a new top-level comment on a lesson. | The Instructor owning the course (`course.instructorId`) | `"New question asked"` | Truncated snippet of the question/comment. | `/courses/<course-slug>/lessons/<lesson-id>#comment-<comment-id>` or `/instructor/questions` |
| `student_enrolled` | A Student purchases an Individual Purchase or claims a Seat on a Team Licence. | The Instructor owning the course (`course.instructorId`) | `"New student enrolled"` | `"<Student Name> enrolled in your course '<Course Title>'."` | `/instructor` or `/instructor/courses/<course-id>/students` |
| `course_rated` | An enrolled Student submits or updates a course rating. | The Instructor owning the course (`course.instructorId`) | `"New <N>-star review"` | Star rating count and optional review comment snippet. | `/instructor` or `/courses/<course-slug>#reviews` |

---

## 5. Universal Trigger & Filtering Rules

1. **Actor Self-Suppression**:
   - An actor never receives a notification for their own action:
     `if (actorUserId === recipientUserId) drop();`
   - *Example*: An Instructor replying to their own comment or an author editing their comment will not trigger self-notifications.
2. **Lapsed Enrollment Suppression**:
   - For `course_updated` (and any general course broadcast notifications), only Students with **active** Enrollments are notified. Students whose enrollments are **Lapsed** (e.g. refunded) are excluded.
3. **Audience Isolation**:
   - Instructor notifications are delivered strictly to the course's owning Instructor (`course.instructorId`), never leaking to platform admins or instructors of other courses.
4. **Idempotency & Re-dispatch Safety**:
   - Notification emission should be idempotent or triggered within domain service transactions to prevent duplicate notifications during network retries or hook replays.

---

## 6. Data Architecture & Schema

### 6.1 Drizzle ORM / SQLite Schema Definition

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { courses } from "./courses";

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipientUserId: integer("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorUserId: integer("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(), // 'comment_reply_created' | 'refund_decided' | 'course_updated' | 'lesson_comment_created' | 'student_enrolled' | 'course_rated'
    courseId: integer("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    targetUrl: text("target_url").notNull(),
    metadata: text("metadata", { mode: "json" }), // e.g. { lessonId, commentId, refundId, rating }
    readAt: text("read_at"), // ISO 8601 string or null when unread
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    recipientReadIdx: index("notifications_recipient_read_idx").on(
      table.recipientUserId,
      table.readAt
    ),
    courseIdx: index("notifications_course_idx").on(table.courseId),
  })
);
```

### 6.2 Query Patterns & Performance
- **Unread count lookup**: Fast index scan using `notifications_recipient_read_idx` filtering `recipient_user_id = :userId AND read_at IS NULL`.
- **Course-Grouped Fetch**: Simple query ordered by `created_at DESC` grouped in memory or joined with `courses` table for rendering the Bento layout.
- **Mark As Read Mutation**: Bulk or single update setting `read_at = CURRENT_TIMESTAMP` for matching IDs and recipient ID.

---

## 7. Deferred & Out-of-Scope Items

### 7.1 Not Yet Specified (Future Roadmap / Post-MVP)
- **Aggregation & Coalescing**: Batching multiple rapid enrollments (e.g., "5 students enrolled in Advanced TS") or thread replies within a 5-minute sliding window into a single notification summary.
- **Real-Time Push Transport**: Live server push mechanisms (Server-Sent Events / WebSockets) versus periodic route revalidation.
- **Data Retention & Pruning**: Automated deletion or archiving of read notifications older than 90 days.

### 7.2 Out of Scope
- **External Delivery Channels**: Transactional emails, SMS alerts, or webhook integrations. (The domain dispatcher structure anticipates external channel listeners, but no external providers are implemented in MVP).
- **Mobile Push / APNS / Web Push Notifications**.

---

## 8. Implementation Rollout Plan & Vertical Slices

1. **Slice 1: Database Schema & Migration**:
   - Add `notifications` table to `app/db/schema.ts`.
   - Run migration and update seed script with mock notifications for DevUI accounts.
2. **Slice 2: Domain Notification Service & Event Hooks**:
   - Implement `createNotification(...)`, `markAsRead(...)`, and event hooks on discussion comments, enrollments, ratings, and refund decisions.
3. **Slice 3: Header Affordance & Popover (Variant A)**:
   - Integrate unread bell indicator and quick popover in global navigation header.
4. **Slice 4: Course-Grouped Bento Notification Center (`/notifications`, Variant C)**:
   - Implement `/notifications` route with course grouping, read/unread filters, and mark-all actions.
