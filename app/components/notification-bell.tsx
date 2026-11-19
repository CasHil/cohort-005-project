import { useState } from "react";
import { Link, useFetcher } from "react-router";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Star,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { cn } from "~/lib/utils";

export interface HeaderNotificationItem {
  id: number;
  eventType: string;
  title: string;
  body: string;
  targetUrl: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationBellProps {
  unreadCount: number;
  recentNotifications: HeaderNotificationItem[];
}

function getNotificationIcon(eventType: string) {
  switch (eventType) {
    case "lesson_comment_created":
      return <HelpCircle className="size-4 text-amber-500" />;
    case "comment_reply_created":
      return <MessageSquare className="size-4 text-blue-500" />;
    case "student_enrolled":
      return <UserPlus className="size-4 text-emerald-500" />;
    case "course_rated":
      return <Star className="size-4 text-yellow-500 fill-yellow-500" />;
    case "course_updated":
      return <Sparkles className="size-4 text-purple-500" />;
    case "refund_decided":
      return <RefreshCw className="size-4 text-rose-500" />;
    default:
      return <Bell className="size-4 text-muted-foreground" />;
  }
}

function formatRelativeTime(dateString: string) {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationBell({
  unreadCount,
  recentNotifications,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();

  function handleMarkAllAsRead() {
    fetcher.submit(
      { intent: "mark-all-read" },
      { method: "post", action: "/api/notifications" }
    );
  }

  function handleMarkOneAsRead(id: number) {
    fetcher.submit(
      { intent: "mark-as-read", notificationId: String(id) },
      { method: "post", action: "/api/notifications" }
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Open notifications popover"
        aria-expanded={isOpen}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-84 sm:w-96 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                recentNotifications.map((notif) => {
                  const isUnread = !notif.readAt;
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        "group relative flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/40",
                        isUnread && "bg-primary/5"
                      )}
                    >
                      <div className="mt-0.5 shrink-0 rounded-full p-1.5 bg-background border border-border/80 shadow-2xs">
                        {getNotificationIcon(notif.eventType)}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <Link
                          to={notif.targetUrl}
                          onClick={() => {
                            if (isUnread) {
                              handleMarkOneAsRead(notif.id);
                            }
                            setIsOpen(false);
                          }}
                          className="block focus:outline-hidden"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notif.body}
                          </p>
                        </Link>
                      </div>

                      {/* Quick action button / unread dot */}
                      <div className="absolute right-3 top-3.5 flex items-center">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOneAsRead(notif.id);
                            }}
                            className="size-5 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground text-primary transition-colors"
                            title="Mark as read"
                            aria-label="Mark notification as read"
                          >
                            <span className="size-2 rounded-full bg-primary" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border p-3 text-center bg-card rounded-b-xl">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary font-medium hover:underline"
              >
                View all notifications →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
