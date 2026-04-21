/**
 * dashboardQueries.js
 *
 * Fetches all data needed for a user-facing dashboard.
 * Assumes a `pool` exported from a pg (node-postgres) connection module.
 *
 * Usage:
 *   const { getDashboardData } = require('./dashboardQueries');
 *   const data = await getDashboardData(userId);
 */

const { pool } = require('../db/db.js'); 

// ─── Individual query helpers ─────────────────────────────────────────────────

/**
 * Basic profile info for the header / greeting.
 */
async function getUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT
       id,
       first_name,
       last_name,
       email,
       phone,
       is_active,
       created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Upcoming meetings the user is attending (next 30 days).
 * Includes calendar name and attendee count.
 */
async function getUpcomingMeetings(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT
       m.id,
       m.title,
       m.description,
       m.location,
       m.meeting_type,
       m.color,
       m.start_time,
       m.end_time,
       m.status,
       m.capacity,
       c.name            AS calendar_name,
       ma.status         AS rsvp_status,
       COUNT(ma2.user_id) AS attendee_count
     FROM meetings m
     JOIN meeting_attendees ma  ON ma.meeting_id = m.id AND ma.user_id = $1
     JOIN calendars c           ON c.id = m.calendar_id
     LEFT JOIN meeting_attendees ma2 ON ma2.meeting_id = m.id
     WHERE m.start_time BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       AND m.status != 'cancelled'
     GROUP BY m.id, c.name, ma.status
     ORDER BY m.start_time ASC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

/**
 * Groups the user belongs to, including their role.
 */
async function getUserGroups(userId) {
  const { rows } = await pool.query(
    `SELECT
       g.id,
       g.name,
       g.description,
       gm.role
     FROM groups g
     JOIN group_memberships gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.name ASC`,
    [userId]
  );
  return rows;
}

/**
 * Calendars accessible to the user (both personal and group-owned).
 */
async function getUserCalendars(userId) {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.owner_type,
       c.owner_id
     FROM calendars c
     JOIN user_calendars uc ON uc.calendar_id = c.id
     WHERE uc.user_id = $1
     ORDER BY c.name ASC`,
    [userId]
  );
  return rows;
}

/**
 * The user's saved time-slot preferences (for scheduling suggestions).
 */
async function getTimeSlotPreferences(userId) {
  const { rows } = await pool.query(
    `SELECT
       id,
       day_of_week,
       start_time,
       end_time
     FROM time_slot_preferences
     WHERE user_id = $1
     ORDER BY day_of_week ASC, start_time ASC`,
    [userId]
  );
  return rows;
}

/**
 * Summary counts useful for dashboard stat cards.
 */
async function getDashboardStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       /* upcoming meetings in next 7 days */
       COUNT(DISTINCT CASE
         WHEN m.start_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
           AND m.status != 'cancelled'
         THEN m.id END)                          AS upcoming_meetings_7d,

       /* total groups */
       COUNT(DISTINCT gm.group_id)               AS total_groups,

       /* pending invites (status = 'invited') */
       COUNT(DISTINCT CASE
         WHEN ma.status = 'invited'
         THEN ma.meeting_id END)                 AS pending_invites,

       /* calendars accessible */
       COUNT(DISTINCT uc.calendar_id)            AS total_calendars

     FROM users u
     LEFT JOIN meeting_attendees ma ON ma.user_id = u.id
     LEFT JOIN meetings m           ON m.id = ma.meeting_id
     LEFT JOIN group_memberships gm ON gm.user_id = u.id
     LEFT JOIN user_calendars uc    ON uc.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0];
}

/**
 * Recent activity: meetings created by the user in the last 30 days.
 */
async function getRecentActivity(userId, limit = 5) {
  const { rows } = await pool.query(
    `SELECT
       m.id,
       m.title,
       m.status,
       m.start_time,
       m.created_at,
       c.name AS calendar_name
     FROM meetings m
     JOIN calendars c ON c.id = m.calendar_id
     WHERE m.created_by = $1
       AND m.created_at >= NOW() - INTERVAL '30 days'
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// ─── Aggregated dashboard loader ─────────────────────────────────────────────

/**
 * Fetches all dashboard data for a user in parallel.
 *
 * @param {number} userId
 * @returns {Promise<{
 *   profile: object,
 *   stats: object,
 *   upcomingMeetings: object[],
 *   groups: object[],
 *   calendars: object[],
 *   timeSlotPreferences: object[],
 *   recentActivity: object[]
 * }>}
 */
async function getDashboardData(userId) {
  const [
    profile,
    stats,
    upcomingMeetings,
    groups,
    calendars,
    timeSlotPreferences,
    recentActivity,
  ] = await Promise.all([
    getUserProfile(userId),
    getDashboardStats(userId),
    getUpcomingMeetings(userId),
    getUserGroups(userId),
    getUserCalendars(userId),
    getTimeSlotPreferences(userId),
    getRecentActivity(userId),
  ]);

  return {
    profile,
    stats,
    upcomingMeetings,
    groups,
    calendars,
    timeSlotPreferences,
    recentActivity,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getDashboardData,
  // Export individuals if you need them separately in route handlers
  getUserProfile,
  getDashboardStats,
  getUpcomingMeetings,
  getUserGroups,
  getUserCalendars,
  getTimeSlotPreferences,
  getRecentActivity,
};
