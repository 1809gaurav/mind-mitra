import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthScreen from './AuthScreen';
import { loginUser, registerUser } from '../../api/auth';
import { useAppContext } from '../../context/AppContext';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setToken, refreshUser } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await loginUser(email, password);
      setToken(res.data.access_token, res.data.refresh_token);
      await refreshUser();
      toast.success('Signed in successfully!');
      navigate('/home');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      await registerUser({ email, password, name });
      const loginRes = await loginUser(email, password);
      setToken(loginRes.data.access_token, loginRes.data.refresh_token);
      await refreshUser();
      toast.success('Account created successfully!');
      navigate('/home');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      onSignIn={handleSignIn}
      onRegister={handleRegister}
      loading={loading}
    />
  );
};

export default LoginScreen;
