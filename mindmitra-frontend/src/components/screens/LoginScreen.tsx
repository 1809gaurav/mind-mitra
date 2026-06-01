import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthScreen from './AuthScreen';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AuthScreen
      onSignIn={() => navigate('/home')}
      onRegister={() => navigate('/home')}
    />
  );
};

export default LoginScreen;
