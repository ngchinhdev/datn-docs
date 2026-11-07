import { NotBuilt } from '@/components/mock/not-built';
import { mockScreens } from '@/mock/screens';

export default function SignupPage() {
  return <NotBuilt screen={mockScreens.find((s) => s.routes.includes('/signup'))} path="/signup" />;
}
