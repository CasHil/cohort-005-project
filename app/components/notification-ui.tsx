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

export function getNotificationIcon(eventType: string) {
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

export function formatRelativeTime(dateString: string): string {
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
