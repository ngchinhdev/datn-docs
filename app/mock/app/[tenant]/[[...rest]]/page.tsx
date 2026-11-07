import Link from 'next/link';
import { notFound } from 'next/navigation';
import { screenForAppPath, screenStatusLabel } from '@/mock/screens';
import { fixtureBySlug } from '@/mock/selection';

/** Sidebar entries whose screen is not built yet land here instead of a 404. */
export default async function NotBuiltPage({
  params,
}: PageProps<'/mock/app/[tenant]/[[...rest]]'>) {
  const { tenant, rest = [] } = await params;
  if (!fixtureBySlug(tenant)) notFound();
  const screen = screenForAppPath(rest);

  return (
    <div className="sp-empty">
      <h1 className="title m-0">
        {screen ? `${screen.code} · ${screen.title}` : `/${rest.join('/')}`}
      </h1>
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
