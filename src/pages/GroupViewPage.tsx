import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupChatView } from '@/components/GroupChatView';

const GroupViewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <GroupChatView onBack={() => navigate('/dashboard')} />
  );
};

export default GroupViewPage;
