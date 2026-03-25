import { type FormEvent, useEffect, useMemo, useState } from "react";

import { cancelMeeting, createMeeting, listMeetings, updateMeetingRsvp, type Meeting } from "../../services/meetingsApi";

function toDateTimeString(date: string, time: string) {
  return `${date}T${time}:00`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DEFAULT_COLOR = "#2563eb";

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [attendeeEmails, setAttendeeEmails] = useState("");

  async function loadMeetings() {
    setLoading(true);
    setError("");
    try {
      const data = await listMeetings();
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const now = new Date();
    setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
    loadMeetings();
  }, []);

  const groupedMeetings = useMemo(() => {
    const upcoming = meetings.filter((meeting) => new Date(meeting.end_time) >= new Date());
    const past = meetings.filter((meeting) => new Date(meeting.end_time) < new Date());
    return { upcoming, past };
  }, [meetings]);

  async function handleCreateMeeting(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !date) {
      setError("Please provide a title and date.");
      return;
    }

    if (endTime <= startTime) {
      setError("Meeting end time must be after the start time.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        color: DEFAULT_COLOR,
        start_time: toDateTimeString(date, startTime),
        end_time: toDateTimeString(date, endTime),
        attendee_emails: attendeeEmails
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean),
      });

      setMeetings((prev) => [...prev, created].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setTitle("");
      setDescription("");
      setLocation("");
      setAttendeeEmails("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelMeeting(meetingId: number) {
    try {
      const updated = await cancelMeeting(meetingId);
      setMeetings((prev) => prev.map((meeting) => (meeting.id === meetingId ? updated : meeting)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel meeting.");
    }
  }

  async function handleRsvp(meetingId: number, status: "accepted" | "declined") {
    try {
      const updated = await updateMeetingRsvp(meetingId, status);
      setMeetings((prev) => prev.map((meeting) => (meeting.id === meetingId ? updated : meeting)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update RSVP.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Meetings</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Create team meetings, invite registered users by email, and manage RSVP status.
        </p>
      </div>

      <form onSubmit={handleCreateMeeting} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Meeting title"
            className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location or meeting link"
            className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          rows={3}
          className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <input
          value={attendeeEmails}
          onChange={(event) => setAttendeeEmails(event.target.value)}
          placeholder="Invite attendee emails, comma-separated"
          className="rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Meeting"}
          </button>
        </div>
      </form>

      {loading ? <div className="rounded-xl bg-white p-6 text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">Loading meetings...</div> : null}

      {!loading ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Upcoming</h2>
            {groupedMeetings.upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No upcoming meetings yet.
              </div>
            ) : (
              groupedMeetings.upcoming.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onCancel={handleCancelMeeting}
                  onRsvp={handleRsvp}
                />
              ))
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Past</h2>
            {groupedMeetings.past.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Past meetings will show up here after you start scheduling.
              </div>
            ) : (
              groupedMeetings.past.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onCancel={handleCancelMeeting}
                  onRsvp={handleRsvp}
                />
              ))
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MeetingCard({
  meeting,
  onCancel,
  onRsvp,
}: {
  meeting: Meeting;
  onCancel: (meetingId: number) => Promise<void>;
  onRsvp: (meetingId: number, status: "accepted" | "declined") => Promise<void>;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: meeting.color }} />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{meeting.title}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(meeting.start_time)} - {formatDateTime(meeting.end_time)}</p>
          {meeting.location ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meeting.location}</p> : null}
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${meeting.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
          {meeting.status}
        </span>
      </div>

      {meeting.description ? <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{meeting.description}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{meeting.accepted_count} accepted</span>
        <span>{meeting.invited_count} invited</span>
        <span>{meeting.declined_count} declined</span>
        <span>{meeting.is_organizer ? "Organizer" : `Your RSVP: ${meeting.current_user_status ?? "n/a"}`}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {meeting.attendees.map((attendee) => (
          <span key={attendee.user_id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {attendee.first_name} {attendee.last_name} - {attendee.status}
          </span>
        ))}
      </div>

      {meeting.status !== "cancelled" ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {meeting.is_organizer ? (
            <button
              type="button"
              onClick={() => void onCancel(meeting.id)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Cancel Meeting
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void onRsvp(meeting.id, "accepted")}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void onRsvp(meeting.id, "declined")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Decline
              </button>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}
