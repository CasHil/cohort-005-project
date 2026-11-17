import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Star,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Search,
  BookOpen,
} from "lucide-react";
import {
  INITIAL_NOTIFICATIONS,
  type MockNotification,
  type NotificationType,
} from "~/components/notifications-mock-data";
import { PrototypeSwitcher } from "~/components/prototype-switcher";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
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

// ---------------------------------------------------------------------------
// Variant A View: Classic Feed with Filter Pills & Inline Quick Actions
// ---------------------------------------------------------------------------
function FullVariantA({
  items,
  markAsRead,
  markAllAsRead,
}: {
  items: MockNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const unreadCount = items.filter((n) => !n.isRead).length;

  const filtered = items.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "questions") return n.type === "instructor_question";
    if (filter === "replies") return n.type === "comment_reply";
    if (filter === "enrollments") return n.type === "student_enrollment" || n.type === "refund_request";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold">Variant A: Classic Chronological Feed</h2>
          <p className="text-sm text-muted-foreground">
            Linear feed with single-click inline triage and category chips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-1.5 size-4" />
              Mark all as read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: `All (${items.length})` },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "questions", label: "Questions & Answers" },
          { id: "replies", label: "Discussions & Replies" },
          { id: "enrollments", label: "Enrollments & Billing" },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id)}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-medium transition-colors border",
              filter === chip.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border divide-y divide-border bg-card shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No notifications in this view.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-4 p-4 transition-colors hover:bg-muted/40",
                !item.isRead && "bg-primary/5 font-medium"
              )}
            >
              <div className="mt-1 rounded-full p-2 bg-background border border-border shrink-0 shadow-xs">
                {getNotificationIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {item.createdAt}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                  {item.body}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                    {item.courseTitle}
                  </span>
                  {item.lessonTitle && (
                    <span className="text-muted-foreground truncate">
                      ↳ {item.lessonTitle}
                    </span>
                  )}
                  <Link
                    to={item.actionUrl}
                    onClick={() => markAsRead(item.id)}
                    className="ml-auto font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Take action <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
              {!item.isRead && (
                <button
                  onClick={() => markAsRead(item.id)}
                  title="Mark as read"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Check className="size-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant B View: Split Master-Detail / Email-Style Inbox Layout
// ---------------------------------------------------------------------------
function FullVariantB({
  items,
  markAsRead,
  markAllAsRead,
}: {
  items: MockNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? "");
  const selectedItem = items.find((i) => i.id === selectedId) ?? items[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold">Variant B: Split Two-Pane Inbox</h2>
          <p className="text-sm text-muted-foreground">
            High-density list on left, rich contextual inspection & primary call-to-action on right.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Mark all read
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px] border border-border rounded-xl overflow-hidden bg-card">
        {/* Left pane: list */}
        <div className="md:col-span-5 border-r border-border overflow-y-auto divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                markAsRead(item.id);
              }}
              className={cn(
                "p-3 cursor-pointer transition-colors text-left",
                selectedId === item.id
                  ? "bg-accent/60"
                  : "hover:bg-muted/40",
                !item.isRead && "font-semibold bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1 text-xs">
                <span className="flex items-center gap-1.5 font-medium truncate">
                  {getNotificationIcon(item.type)}
                  {item.actorName}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {item.createdAt}
                </span>
              </div>
              <div className="text-xs text-foreground line-clamp-1 mb-1">
                {item.title}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Right pane: detail view */}
        <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between bg-background">
          {selectedItem ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
                    {getNotificationIcon(selectedItem.type)}
                    {selectedItem.type.replace("_", " ").toUpperCase()}
                  </span>
                  <h3 className="text-lg font-bold">{selectedItem.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From <strong>{selectedItem.actorName}</strong> • {selectedItem.createdAt}
                  </p>
                </div>
                {!selectedItem.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead(selectedItem.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/20 text-sm leading-relaxed">
                {selectedItem.body}
              </div>

              <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Target Course:</span>
                  <span className="font-medium text-foreground">{selectedItem.courseTitle}</span>
                </div>
                {selectedItem.lessonTitle && (
                  <div className="flex justify-between">
                    <span>Lesson:</span>
                    <span className="font-medium text-foreground">{selectedItem.lessonTitle}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Role Audience:</span>
                  <span className="font-medium capitalize text-foreground">{selectedItem.targetRole}</span>
                </div>
              </div>

              <div className="pt-4">
                <Link to={selectedItem.actionUrl}>
                  <Button className="w-full">
                    Open Thread / Action Page
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a notification from the list
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant C View: Grouped by Course / Context Bento Grid
// ---------------------------------------------------------------------------
function FullVariantC({
  items,
  markAsRead,
  markAllAsRead,
}: {
  items: MockNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}) {
  // Group notifications by course
  const courseGroups = items.reduce<Record<string, MockNotification[]>>((acc, item) => {
    acc[item.courseTitle] = acc[item.courseTitle] || [];
    acc[item.courseTitle].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold">Variant C: Course-Grouped Bento Grid</h2>
          <p className="text-sm text-muted-foreground">
            Organized hierarchically by course context so instructors & learners can batch-process per course.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Mark all read
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(courseGroups).map(([courseTitle, courseItems]) => {
          const unreadInGroup = courseItems.filter((i) => !i.isRead).length;
          return (
            <Card key={courseTitle} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <CardTitle className="text-base truncate max-w-[260px]">
                    {courseTitle}
                  </CardTitle>
                </div>
                {unreadInGroup > 0 ? (
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500">
                    {unreadInGroup} unread
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">All caught up</span>
                )}
              </CardHeader>
              <CardContent className="flex-1 divide-y divide-border/40 p-0">
                {courseItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 flex items-start gap-3 transition-colors hover:bg-muted/30",
                      !item.isRead && "bg-primary/5"
                    )}
                  >
                    <div className="mt-0.5">{getNotificationIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-semibold text-foreground truncate">{item.title}</span>
                        <span className="text-[10px] text-muted-foreground">{item.createdAt}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <Link
                          to={item.actionUrl}
                          onClick={() => markAsRead(item.id)}
                          className="font-medium text-primary hover:underline text-[11px]"
                        >
                          Jump to lesson →
                        </Link>
                        {!item.isRead && (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Route Page
// ---------------------------------------------------------------------------
export default function NotificationsPrototypePage() {
  const [searchParams] = useSearchParams();
  const currentVariant = searchParams.get("variant") ?? "A";
  const [items, setItems] = useState<MockNotification[]>(INITIAL_NOTIFICATIONS);

  function markAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  function markAllAsRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const variants = [
    { id: "A", name: "Popover Header + Chronological Feed" },
    { id: "B", name: "Slide-out Drawer + Split Master/Detail Inbox" },
    { id: "C", name: "Sidebar Badge + Course Bento Grid" },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8 pb-24">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Notifications Prototype</span>
      </nav>

      {/* Overview header */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h1 className="text-lg font-bold text-amber-500">
          UI Prototype for Issue #2: In-App Notification Surfaces
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Switch variants using the floating bottom pill or keyboard arrows (← / →). Test interactions like marking read, filtering unread, and navigating to context.
        </p>
      </div>

      {currentVariant === "A" && (
        <FullVariantA
          items={items}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
        />
      )}
      {currentVariant === "B" && (
        <FullVariantB
          items={items}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
        />
      )}
      {currentVariant === "C" && (
        <FullVariantC
          items={items}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
        />
      )}

      {/* Floating switcher */}
      <PrototypeSwitcher variants={variants} current={currentVariant} />
    </div>
  );
}
