-- db/schema.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT
);

-- We relate time slot preferences with the user via user_id, also days of the week must be between 0 and 6
CREATE TABLE time_slot_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- We relate the users with the group_memberships via user_id and the groups via group_id, therefore making a relation between users and groups 
CREATE TABLE group_memberships (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  role TEXT,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE calendars (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'group')),
  owner_id INTEGER NOT NULL
);

-- We relate the users with the user_id and calenders with the calender_id 
CREATE TABLE user_calendars (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  calendar_id INTEGER REFERENCES calendars(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, calendar_id)
);

CREATE TABLE meetings (
  id SERIAL PRIMARY KEY,
  calendar_id INTEGER NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER,
  setup_minutes INTEGER DEFAULT 0,
  cleanup_minutes INTEGER DEFAULT 0
);

-- Here we relate the users with the meeting 
CREATE TABLE meeting_attendees (
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('invited', 'accepted', 'declined')),
  PRIMARY KEY (meeting_id, user_id)
);

SELECT capacity FROM meetings WHERE id = $1;

