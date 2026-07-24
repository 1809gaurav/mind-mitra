import { Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import MindMitraApp from "./components/MindMitraApp";
import NotFoundPage from "./components/NotFoundPage";
import AdminScreen from "./components/screens/AdminScreen";
import ForgotPasswordScreen from "./components/screens/ForgotPasswordScreen";
import LandingPage from "./components/screens/LandingPage";
import ResetPasswordScreen from "./components/screens/ResetPasswordScreen";
import { AppProvider } from "./context/AppContext";

export default function App() {
  return (
    <AppProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: 'var(--toast-bg, #1e293b)',
            color: '#fff',
            fontSize: '14px',
            padding: '12px 16px',
            maxWidth: '380px',
          },
        }}
      />
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<MindMitraApp />} />
        <Route path="/app" element={<MindMitraApp />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        {/* Admin panel — protected inside AdminScreen itself */}
        <Route path="/admin" element={<AdminScreen />} />
        {/* Unknown routes show 404 */}
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
    </AppProvider>
  );
}
