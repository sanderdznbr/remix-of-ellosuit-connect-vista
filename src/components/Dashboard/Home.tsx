import React from 'react';
import AIAssistantHome from './AIAssistantHome';

interface HomeProps {
  onNavigate: (item: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  return <AIAssistantHome />;
};

export default Home;
