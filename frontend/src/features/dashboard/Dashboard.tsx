import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  fetchNotifications,
  fetchPendingInvites,
  markNotificationRead,
  type NotificationItem,
  type PendingInviteItem,
} from "../../services/notificationsApi";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [pendingInvites, setPendingInvites] = useState<PendingInviteItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [pending, recent] = await Promise.all([
          fetchPendingInvites(),
          fetchNotifications(6),
        ]);
        if (!isMounted) return;
        setPendingInvites(pending);
        setNotifications(recent);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleMarkRead(notificationId: number) {
    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? updated : notification
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification as read.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Review pending invites and recent meeting updates.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</p> : null}

      {!loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Pending Invites</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Meetings waiting on your RSVP.</p>
              </div>
              <Link to="/meetings" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                Open meetings
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No pending invites right now.</p>
              ) : (
                pendingInvites.map((invite) => (
                  <article key={invite.meeting_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{invite.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(invite.start_time)} - {formatDateTime(invite.end_time)}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Organizer: {invite.organizer_name}</p>
                    {invite.location ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{invite.location}</p> : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Notifications</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">In-app updates for invites, cancellations, and reschedules.</p>

            <div className="mt-5 space-y-4">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <article key={notification.id} className={`rounded-xl border p-4 ${notification.read_at ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40" : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(notification.created_at)}</p>
                      </div>
                      {!notification.read_at ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(notification.id)}
                          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
