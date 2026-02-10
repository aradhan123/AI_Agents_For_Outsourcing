import { createBrowserRouter } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import AppLayout from "../layouts/AppLayout";
import Login from "../features/auth/Login";
import Signup from "../features/auth/Signup";
import Dashboard from "../features/dashboard/Dashboard";
import GroupList from "../features/groups/GroupList";
import PersonalCalendar from "../features/calendar/PersonalCalendar";
import MeetingList from "../features/meetings/MeetingList";
import ProfileSettings from "../features/settings/ProfileSettings";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/groups", element: <GroupList /> },
      { path: "/calendar", element: <PersonalCalendar /> },
      { path: "/meetings", element: <MeetingList /> },
      { path: "/settings", element: <ProfileSettings /> },
    ],
  },
]);