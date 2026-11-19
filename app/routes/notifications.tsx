import { useState } from "react";
import { Link, useFetcher, redirect } from "react-router";
import type { Route } from "./+types/notifications";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import { getNotificationsWithCourseForUser } from "~/lib/notifications.server";
import {
  Check,
  CheckCheck,
  BookOpen,
  RotateCcw,
  Layers,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
  getNotificationIcon,
  formatRelativeTime,
} from "~/components/notification-ui";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    throw redirect("/login");
  }

  const notifications = getNotificationsWithCourseForUser(db, userId, 100);
  return { notifications };
}

type FilterCategory = "all" | "unread" | "discussions" | "administrative";

export default function NotificationsPage({
  loaderData,
}: Route.ComponentProps) {
  const { notifications } = loaderData;
  const [filter, setFilter] = useState<FilterCategory>("all");
  const fetcher = useFetcher();

  const totalUnread = notifications.filter((n) => !n.readAt).length;

  // Filter items
  const filteredItems = notifications.filter((item) => {
    if (filter === "unread") {
      return !item.readAt;
    }
    if (filter === "discussions") {
      return (
        item.eventType === "lesson_comment_created" ||
        item.eventType === "comment_reply_created"
      );
    }
    if (filter === "administrative") {
      return (
        item.eventType === "student_enrolled" ||
        item.eventType === "course_rated" ||
        item.eventType === "course_updated" ||
        item.eventType === "refund_decided"
      );
    }
    return true;
  });

  // Group filtered items by course (or "Platform Updates")
  interface GroupedCourse {
    courseId: number | null;
    courseTitle: string;
    items: typeof notifications;
  }

  const groupsMap = new Map<string, GroupedCourse>();

  for (const item of filteredItems) {
    const key = item.courseId ? String(item.courseId) : "platform";
    const title = item.courseTitle ?? "Platform Updates";
    const existing = groupsMap.get(key);
    if (!existing) {
      groupsMap.set(key, {
        courseId: item.courseId ?? null,
        courseTitle: title,
        items: [item],
      });
    } else {
      existing.items.push(item);
    }
  }

  const groups = Array.from(groupsMap.values());

  function handleMarkAllAsRead() {
    fetcher.submit(
      { intent: "mark-all-read" },
      { method: "post", action: "/api/notifications" }
    );
  }

  function handleMarkCourseAsRead(courseId: number | null) {
    fetcher.submit(
      {
        intent: "mark-course-read",
        courseId: courseId === null ? "null" : String(courseId),
      },
      { method: "post", action: "/api/notifications" }
    );
  }

  function handleToggleRead(id: number, currentRead: boolean) {
    fetcher.submit(
      {
        intent: currentRead ? "mark-as-unread" : "mark-as-read",
        notificationId: String(id),
      },
      { method: "post", action: "/api/notifications" }
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8 pb-24">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Notifications</span>
      </nav>

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
            {totalUnread > 0 && (
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
                {totalUnread} unread
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Stay on top of updates, discussions, and student activity grouped by course.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalUnread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="gap-1.5"
            >
              <CheckCheck className="size-4" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs / Chips */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: `All (${notifications.length})` },
            { id: "unread", label: `Unread (${totalUnread})` },
            { id: "discussions", label: "Discussions & Q&A" },
            { id: "administrative", label: "Course & Administrative" },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors border",
              filter === chip.id
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Bento Grid */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No notifications in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => {
            const unreadInGroup = group.items.filter((i) => !i.readAt).length;
            const totalInGroup = group.items.length;
            const isPlatformCard = group.courseId === null;

            return (
              <Card
                key={group.courseTitle}
                className={cn(
                  "flex flex-col border rounded-xl overflow-hidden shadow-xs",
                  isPlatformCard && "bg-muted/10 border-border/80"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-4 border-b border-border/60 bg-card/60">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {isPlatformCard ? (
                      <Layers className="size-4 text-purple-500 shrink-0" />
                    ) : (
                      <BookOpen className="size-4 text-primary shrink-0" />
                    )}
                    <CardTitle className="text-sm font-semibold truncate text-foreground">
                      {group.courseTitle}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({totalInGroup})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadInGroup > 0 ? (
                      <>
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-500">
                          {unreadInGroup} unread
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkCourseAsRead(group.courseId)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Mark all notifications in this card as read"
                        >
                          Mark read
                        </Button>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        All read
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 divide-y divide-border/40 p-0">
                  {group.items.map((item) => {
                    const isUnread = !item.readAt;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 flex items-start gap-3 transition-colors hover:bg-muted/30",
                          isUnread && "bg-primary/5"
                        )}
                      >
                        <div className="mt-0.5 shrink-0 rounded-full p-1.5 bg-background border border-border/80 shadow-2xs">
                          {getNotificationIcon(item.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-foreground truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.body}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between text-xs">
                            <Link
                              to={item.targetUrl}
                              onClick={() => {
                                if (isUnread) {
                                  handleToggleRead(item.id, false);
                                }
                              }}
                              className="font-medium text-primary hover:underline text-[11px]"
                            >
                              View details →
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleToggleRead(item.id, !isUnread)}
                              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                              title={isUnread ? "Mark as read" : "Mark as unread"}
                            >
                              {isUnread ? (
                                <>
                                  <Check className="size-3" />
                                  <span>Mark read</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="size-3" />
                                  <span>Mark unread</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
