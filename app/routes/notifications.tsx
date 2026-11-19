import type { Route } from "./+types/notifications";
import { Link } from "react-router";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import { getNotificationsForUser } from "~/lib/notifications.server";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    throw redirect("/login");
  }

  const notifications = getNotificationsForUser(db, userId, 100);
  return { notifications };
}

export default function NotificationsPage({ loaderData }: Route.ComponentProps) {
  const { notifications } = loaderData;

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with discussions, courses, and account alerts.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border bg-card shadow-xs overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            You have no notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{n.title}</h3>
                  <span className="text-xs text-muted-foreground">{n.createdAt}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                <div className="mt-2">
                  <Link to={n.targetUrl} className="text-xs text-primary font-medium hover:underline">
                    View details →
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
