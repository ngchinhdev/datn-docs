import Link from 'next/link';
import { screenStatusLabel, type MockScreen } from '@/mock/screens';

/** Stands in for a screen that has no mock yet: its code, name and where to find the list. */
export function NotBuilt({ screen, path }: { screen: MockScreen | undefined; path: string }) {
  return (
    <div className="sp-empty">
      <h1 className="title m-0">{screen ? `${screen.code} · ${screen.title}` : path}</h1>
      <p className="m-0">
        {screen
          ? `${screenStatusLabel.todo}. ${screen.note}`
          : 'Trang này không có trong danh sách màn hình.'}
      </p>
      <Link href="/mock" className="font-medium">
        Về danh sách màn hình
      </Link>
    </div>
  );
}
