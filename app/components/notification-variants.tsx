import { useState } from "react";
import { Link } from "react-router";
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
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  INITIAL_NOTIFICATIONS,
  type MockNotification,
  type NotificationType,
} from "~/components/notifications-mock-data";
import { cn } from "~/lib/utils";

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "instructor_question":
      return <HelpCircle className="size-4 text-amber-500" />;
    case "comment_reply":
      return <MessageSquare className="size-4 text-blue-500" />;
    case "student_enrollment":
      return <UserPlus className="size-4 text-emerald-500" />;
    case "course_rating":
      return <Star className="size-4 text-yellow-500 fill-yellow-500" />;
    case "course_announcement":
      return <Sparkles className="size-4 text-purple-500" />;
    case "refund_request":
      return <RefreshCw className="size-4 text-rose-500" />;
  }
}

function getTypeBadge(type: NotificationType) {
  switch (type) {
    case "instructor_question":
      return "Q&A Question";
    case "comment_reply":
      return "Discussion";
    case "student_enrollment":
      return "Enrollment";
    case "course_rating":
      return "Review";
    case "course_announcement":
      return "Announcement";
    case "refund_request":
      return "Refund";
  }
}

// ---------------------------------------------------------------------------
// Variant A: Floating Popover dropdown on Header + Quick Toast/Pill Preview
// ---------------------------------------------------------------------------
export function NotificationVariantA({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [items, setItems] = useState<MockNotification[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = items.filter((n) => !n.isRead).length;

  const filtered = items.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  function markAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  function markAllAsRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Open notifications popover"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-96 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilter(filter === "all" ? "unread" : "all")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    filter === "unread"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {filter === "unread" ? "Showing Unread" : "All"}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Read all</span>
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No {filter === "unread" ? "unread " : ""}notifications
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/40",
                      !item.isRead && "bg-primary/5 font-medium"
                    )}
                  >
                    <div className="mt-0.5 shrink-0 rounded-lg bg-background p-1.5 shadow-xs border border-border">
                      {getNotificationIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {getTypeBadge(item.type)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.createdAt}
                        </span>
                      </div>
                      <Link
                        to={item.actionUrl}
                        onClick={() => {
                          markAsRead(item.id);
                          setIsOpen(false);
                        }}
                        className="text-xs leading-snug line-clamp-2 hover:underline text-foreground"
                      >
                        {item.body}
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{item.courseTitle}</span>
                      </div>
                    </div>
                    {!item.isRead && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                        className="mt-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border p-2 bg-muted/20 text-center">
              <Link
                to="/notifications?variant=A"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline py-1"
              >
                View full notification center <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant B: Slide-out Right Action Drawer / Sheet
// ---------------------------------------------------------------------------
export function NotificationVariantB({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [items, setItems] = useState<MockNotification[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "learning" | "activity">("all");

  const unreadCount = items.filter((n) => !n.isRead).length;

  const filtered = items.filter((n) => {
    if (activeTab === "learning") {
      return (
        n.type === "course_announcement" ||
        n.type === "comment_reply"
      );
    }
    if (activeTab === "activity") {
      return (
        n.type === "instructor_question" ||
        n.type === "student_enrollment" ||
        n.type === "course_rating" ||
        n.type === "refund_request"
      );
    }
    return true;
  });

  function markAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  function markAllAsRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-xs hover:bg-accent transition-colors"
      >
        <Bell className="size-4 text-muted-foreground" />
        <span>Inbox</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[11px] font-bold text-rose-500">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md border-l border-border bg-background shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h2 className="text-base font-semibold">Notification Drawer</h2>
                  <p className="text-xs text-muted-foreground">
                    Role view: <strong className="capitalize">{currentUserRole}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-muted/30 px-3 pt-2 gap-1 text-xs">
                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "border-b-2 px-3 py-2 font-medium transition-colors",
                    activeTab === "all"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({items.length})
                </button>
                <button
                  onClick={() => setActiveTab("learning")}
                  className={cn(
                    "border-b-2 px-3 py-2 font-medium transition-colors",
                    activeTab === "learning"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Learning
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={cn(
                    "border-b-2 px-3 py-2 font-medium transition-colors",
                    activeTab === "activity"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Instructor / Admin
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/50 p-2">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-muted/40",
                      !item.isRead && "border-l-4 border-l-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        {getNotificationIcon(item.type)}
                        <span>{item.actorName}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{item.createdAt}</span>
                    </div>

                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {item.body}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {item.courseTitle}
                      </span>
                      <div className="flex items-center gap-2">
                        {!item.isRead && (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="text-primary hover:underline"
                          >
                            Mark read
                          </button>
                        )}
                        <Link
                          to={item.actionUrl}
                          onClick={() => {
                            markAsRead(item.id);
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-0.5 font-medium text-foreground hover:text-primary"
                        >
                          Go <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom footer */}
              <div className="border-t border-border p-3 text-center bg-card">
                <Link
                  to="/notifications?variant=B"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Go to Dedicated Notifications Page →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant C: Compact Integrated Sidebar Feed with Live Floating Badge & Dock
// ---------------------------------------------------------------------------
export function NotificationVariantC({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [items, setItems] = useState<MockNotification[]>(INITIAL_NOTIFICATIONS);
  const [showQuickList, setShowQuickList] = useState(false);

  const unreadCount = items.filter((n) => !n.isRead).length;

  function markAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  function markAllAsRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowQuickList(!showQuickList)}
        className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        <span className="relative flex size-2">
          {unreadCount > 0 && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          )}
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <Bell className="size-3.5" />
        <span>{unreadCount} Unread Alerts</span>
      </button>

      {showQuickList && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
            <span className="text-xs font-semibold">Priority Feed</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl p-2.5 text-xs transition-colors border",
                  item.isRead
                    ? "border-transparent bg-muted/30 text-muted-foreground"
                    : "border-primary/20 bg-card shadow-xs text-foreground"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                    {getNotificationIcon(item.type)}
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.createdAt}</span>
                </div>
                <p className="line-clamp-2 text-[11px] leading-relaxed">{item.body}</p>
                <div className="mt-2 flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                  <Link
                    to={item.actionUrl}
                    onClick={() => {
                      markAsRead(item.id);
                      setShowQuickList(false);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    View Context
                  </Link>
                  {!item.isRead && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 text-center border-t border-border mt-2">
            <Link
              to="/notifications?variant=C"
              onClick={() => setShowQuickList(false)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Open Full Inbox Page
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
