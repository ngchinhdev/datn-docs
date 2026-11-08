import Link from 'next/link';
import { SegmentedNav } from '@/components/sapio/segmented';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { tenantFixtures, type BusinessHours } from '@/mock/fixtures';
import { visibleMinutes } from '@/mock/occupation';
import {
  mockScreens,
  screenRoleLabel,
  screenStatusLabel,
  zoneTitle,
  type ScreenStatus,
  type Wave,
  type Zone,
} from '@/mock/screens';

const statusVariant: Record<ScreenStatus, 'outline' | 'secondary' | 'default'> = {
  todo: 'outline',
  in_progress: 'secondary',
  approved: 'default',
};

const WAVES: Wave[] = [1, 2, 3];
const STATUSES: ScreenStatus[] = ['todo', 'in_progress', 'approved'];
const ZONES = Object.keys(zoneTitle) as Zone[];

const weekdayLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const durationMinutes = visibleMinutes;

const formatHours = (hours: BusinessHours[]) =>
  hours.map((h) => `${weekdayLabel[h.weekday]} ${h.open}–${h.close}`).join(', ');

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function MockIndexPage({ searchParams }: PageProps<'/mock'>) {
  const params = await searchParams;
  const wave = WAVES.find((w) => String(w) === first(params.wave));
  const status = STATUSES.find((s) => s === first(params.status));

  const shown = mockScreens.filter(
    (s) => (!wave || s.wave === wave) && (!status || s.status === status),
  );
  const count = (s: ScreenStatus) => mockScreens.filter((screen) => screen.status === s).length;

  /** Link that sets one filter and keeps the other. */
  const hrefWith = (key: 'wave' | 'status', value: string | undefined) => {
    const query = new URLSearchParams();
    const next = { wave: wave && String(wave), status, [key]: value };
    for (const [k, v] of Object.entries(next)) if (v) query.set(k, v);
    const text = query.toString();
    return text ? `/mock?${text}` : '/mock';
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Màn hình mock</h1>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">
            {count('in_progress')}/{mockScreens.length} đang làm
          </strong>
          , {count('approved')} đã chốt, {count('todo')} chưa làm. Mỗi màn đã có mock link vào từng
          cơ sở mẫu; đổi cơ sở và vai trò ở thanh trên hoặc trong menu tài khoản.{' '}
          <Link href="/mock/components" className="font-medium text-primary hover:underline">
            Component Sapio
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Đợt:</span>
            <SegmentedNav
              label="Lọc theo đợt"
              items={[
                { href: hrefWith('wave', undefined), label: 'Tất cả', current: !wave },
                ...WAVES.map((w) => ({
                  href: hrefWith('wave', String(w)),
                  label: String(w),
                  current: wave === w,
                })),
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Trạng thái:</span>
            <SegmentedNav
              label="Lọc theo trạng thái"
              items={[
                { href: hrefWith('status', undefined), label: 'Tất cả', current: !status },
                ...STATUSES.map((s) => ({
                  href: hrefWith('status', s),
                  label: screenStatusLabel[s],
                  current: status === s,
                })),
              ]}
            />
          </div>
        </div>

        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Không có màn nào khớp.{' '}
            <Link href="/mock" className="font-medium text-primary hover:underline">
              Bỏ lọc
            </Link>
          </p>
        )}

        {ZONES.map((zone) => {
          const screens = shown.filter((s) => s.zone === zone);
          if (screens.length === 0) return null;
          return (
            <section key={zone} aria-labelledby={`zone-${zone}`} className="flex flex-col gap-3">
              <h2 id={`zone-${zone}`} className="mt-2 text-lg font-semibold">
                {zone}. {zoneTitle[zone]}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {screens.map((screen) => (
                  <li key={screen.code}>
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle>
                          {screen.code} · {screen.title}
                        </CardTitle>
                        <CardAction>
                          <Badge variant={statusVariant[screen.status]}>
                            {screenStatusLabel[screen.status]}
                          </Badge>
                        </CardAction>
                        <CardDescription>{screen.note}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
                        <span>
                          Đợt {screen.wave} · Mức {screen.level} ·{' '}
                          {screen.roles.map((r) => screenRoleLabel[r]).join(', ') || 'Không có'}
                        </span>
                        {screen.links.map((link) => (
                          <span key={link.label} className="flex flex-wrap gap-x-3">
                            <span>{link.label}:</span>
                            {link.platform ? (
                              <Link
                                href={link.href('')}
                                className="font-medium text-primary hover:underline"
                              >
                                Mở
                              </Link>
                            ) : (
                              tenantFixtures.map((f) => (
                                <Link
                                  key={f.tenant.slug}
                                  href={link.href(f.tenant.slug)}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {f.tenant.name}
                                </Link>
                              ))
                            )}
                          </span>
                        ))}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>

      {tenantFixtures.map((fixture) => (
        <section key={fixture.tenant.slug} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Dữ liệu giả: {fixture.tenant.name}</h2>
          {fixture.branches.map((branch) => (
            <p key={branch.id} className="text-sm text-muted-foreground">
              {branch.name}, {branch.address}. Giờ mở cửa: {formatHours(branch.businessHours)}.
            </p>
          ))}
          <p className="text-sm text-muted-foreground">
            {fixture.resources.length} tài nguyên, {fixture.staff.length} nhân viên,{' '}
            {fixture.customers.length} khách, {fixture.servedSubjects.length} đối tượng được phục
            vụ, {fixture.appointments.length} lịch hẹn.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {fixture.services.map((service) => (
              <Card key={service.id} size="sm">
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-1 text-sm">
                    {service.variants.map((variant) => (
                      <li key={variant.id} className="flex justify-between gap-4">
                        <span>
                          {variant.name}
                          {variant.segments.some((s) => s.kind === 'wait') && (
                            <Badge variant="secondary" className="ms-2">
                              có đoạn chờ
                            </Badge>
                          )}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {durationMinutes(variant)} phút · {vnd.format(variant.priceVnd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
