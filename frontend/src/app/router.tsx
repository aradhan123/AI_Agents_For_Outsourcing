import ProtectedRoute from "../components/ProtectedRoute";

{
  element: <AppLayout />,
  children: [
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ),
    },
  ],
}
