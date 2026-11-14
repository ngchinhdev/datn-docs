import type { Metadata } from 'next';
import { MailboxScreen } from './mailbox-screen';

export const metadata: Metadata = {
  title: 'Hộp thư mẫu · Sapio',
};

export default function MailboxPage() {
  return <MailboxScreen />;
}
