import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Nền tảng SaaS đặt lịch đa tài nguyên</h1>
      <p className="text-fd-muted-foreground">Tài liệu đồ án và mock giao diện.</p>
      <div className="flex gap-4">
        <Link href="/docs" className="font-medium underline">
          Tài liệu
        </Link>
        <Link href="/mock" className="font-medium underline">
          Mock giao diện
        </Link>
      </div>
    </main>
  );
}
