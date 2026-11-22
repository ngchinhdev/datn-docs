import { redirect } from 'next/navigation';

/** The way into the mock is the sign-in page; the list of screens is at `/mock/screens`. */
export default function MockEntryPage() {
  redirect('/mock/login');
}
