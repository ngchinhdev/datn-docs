import type { Metadata } from 'next';
import { LandingScreen } from './landing-screen';

export const metadata: Metadata = {
  title: 'Sapio · Sắp lịch cho người, ghế và phòng cùng lúc',
};

export default function LandingPage() {
  return <LandingScreen />;
}
