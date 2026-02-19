import React from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import PasswordResetRequest from '../components/auth/PasswordResetRequest';
import PasswordResetConfirm from '../components/auth/PasswordResetConfirm';

const PasswordReset: React.FC = () => {
  const { token } = useParams<{ token?: string }>();

  return (
    <MainLayout>
      {token ? <PasswordResetConfirm /> : <PasswordResetRequest />}
    </MainLayout>
  );
};

export default PasswordReset;