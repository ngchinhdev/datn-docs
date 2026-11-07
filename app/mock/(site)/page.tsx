import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { BusinessHours, ServiceVariant } from '@/mock/fixtures';
import { mockScreens, screenRoleLabel, screenStatusLabel, type ScreenStatus } from '@/mock/screens';
import { tenantFixtures } from '@/mock/fixtures';

const statusVariant: Record<ScreenStatus, 'outline' | 'secondary' | 'default'> = {
  todo: 'outline',
  in_progress: 'secondary',
  approved: 'default',
};

const weekdayLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const durationMinutes = (variant: ServiceVariant) =>
  Math.max(...variant.segments.map((s) => s.endMinute));

const formatHours = (hours: BusinessHours[]) =>
  hours.map((h) => `${weekdayLabel[h.weekday]} ${h.open}–${h.close}`).join(', ');

export default function MockIndexPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Màn hình mock</h1>
        <p className="text-sm text-muted-foreground">
          Mỗi màn có link vào từng cơ sở mẫu; đổi cơ sở và vai trò ở thanh trên của màn đó.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {mockScreens.map((screen) => (
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
                    Vai trò: {screen.roles.map((r) => screenRoleLabel[r]).join(', ') || 'Không có'}
                  </span>
                  {screen.links.map((link) => (
                    <span key={link.label} className="flex flex-wrap gap-x-3">
                      <span>{link.label}:</span>
                      {tenantFixtures.map((f) => (
                        <Link
                          key={f.tenant.slug}
                          href={link.href(f.tenant.slug)}
                          className="font-medium text-primary hover:underline"
                        >
                          {f.tenant.name}
                        </Link>
                      ))}
                    </span>
                  ))}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
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
