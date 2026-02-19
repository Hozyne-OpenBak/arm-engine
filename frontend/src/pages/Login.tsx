import React from 'react';
import MainLayout from '../layouts/MainLayout';
import LoginForm from '../components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <MainLayout>
      <LoginForm />
    </MainLayout>
  );
};

export default Login;