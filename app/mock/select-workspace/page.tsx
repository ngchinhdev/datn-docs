import type { Metadata } from 'next';
import { SelectScreen } from './select-screen';

export const metadata: Metadata = {
  title: 'Chọn cơ sở · Sapio',
};

export default function SelectWorkspacePage() {
  return <SelectScreen />;
}
