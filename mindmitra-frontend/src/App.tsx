import { Route, Routes } from "react-router-dom";
import MindMitraApp from "./components/MindMitraApp";
import NotFoundPage from "./components/NotFoundPage";
import AdminScreen from "./components/screens/AdminScreen";
import ForgotPasswordScreen from "./components/screens/ForgotPasswordScreen";
import LandingPage from "./components/screens/LandingPage";
import ResetPasswordScreen from "./components/screens/ResetPasswordScreen";
import NotificationPrompt from "./components/NotificationPrompt";
import { AppProvider } from "./context/AppContext";

export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        {/* Admin panel — protected inside AdminScreen itself */}
        <Route path="/admin" element={<AdminScreen />} />
        {/* Unknown routes show 404 */}
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
      {/* Persistent banner — pushes the user toward enabling background
          SOS notifications (issue #119). */}
      <NotificationPrompt />
    </AppProvider>
  );
}
