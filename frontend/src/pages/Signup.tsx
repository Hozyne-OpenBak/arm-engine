import React from 'react';
import MainLayout from '../layouts/MainLayout';
import SignupForm from '../components/auth/SignupForm';

const Signup: React.FC = () => {
  return (
    <MainLayout>
      <SignupForm />
    </MainLayout>
  );
};

export default Signup;