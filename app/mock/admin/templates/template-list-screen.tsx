'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTemplateStore } from '@/components/mock/template-store';
import { Button } from '@/components/sapio/button';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import type { IndustryTemplate } from '@/mock/fixtures';
import { contentSummary, statusLabel } from '@/mock/template-view';
import { formatFullDate } from '@/mock/time';

const BADGE = { open: 'sp-badge--confirmed', soon: 'sp-badge--pending', hidden: '' } as const;

function Version({ template }: { template: IndustryTemplate }) {
  const published = template.publishedVersion;
  return (
    <>
      {published ? `Bản ${published.number}` : <span className="sp-muted">Chưa xuất bản</span>}
      {template.draft && (
        <>
          {' '}
          <span className="sp-badge sp-badge--pending">Có bản nháp</span>
        </>
      )}
    </>
  );
}

/** Gói cấu hình ngành, the list (MH-59): what new tenants can pick at sign-up, and in which version. */
export function TemplateListScreen() {
  const { templates } = useTemplateStore();
  const toast = useToast();

  return (
    <div className="sp-shell__content">
      <PageHeader
        title="Gói cấu hình ngành"
        sub="Dữ liệu nạp sẵn cho cơ sở mới ở bước chọn ngành. Lõi đặt lịch không biết ngành nào, mọi khác biệt nằm ở đây."
        actions={
          <Button
            variant="primary"
            onClick={() => toast({ text: 'Thêm ngành: chưa có trong mock.' })}
          >
            <Plus size={16} aria-hidden="true" />
            Thêm ngành
          </Button>
        }
      />
      <div
        className="sp-table-wrap max-md:hidden!"
        tabIndex={0}
        role="region"
        aria-label="Danh sách gói cấu hình ngành, cuộn được"
      >
        <table className="sp-table">
          <caption className="sp-sr-only">Danh sách gói cấu hình ngành</caption>
          <thead>
            <tr>
              <th scope="col">Ngành</th>
              <th scope="col">Ở bước đăng ký</th>
              <th scope="col">Phiên bản</th>
              <th scope="col" className="sp-table__num">
                Cơ sở đã tạo
              </th>
              <th scope="col">Nội dung</th>
              <th scope="col">Sửa lần cuối</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const summary = contentSummary(t);
              return (
                <tr key={t.id}>
                  <td>
                    <span className="sp-table__primary">
                      <Link href={`/mock/admin/templates/${t.id}`}>{t.name}</Link>
                    </span>
                    <span className="sp-table__secondary">{t.id}</span>
                  </td>
                  <td>
                    <span className={`sp-badge ${BADGE[t.status]}`}>{statusLabel[t.status]}</span>
                  </td>
                  <td>
                    <Version template={t} />
                  </td>
                  <td className="sp-table__num">
                    <span className="sp-num">{t.publishedVersion?.tenantsCreated ?? 0}</span>
                  </td>
                  <td>{summary ?? <span className="sp-muted">Chưa có dịch vụ</span>}</td>
                  <td>
                    <span className="sp-num">{formatFullDate(t.updatedAt)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="sp-cards md:hidden!" aria-label="Danh sách gói cấu hình ngành">
        {templates.map((t) => (
          <li key={t.id}>
            <Link href={`/mock/admin/templates/${t.id}`} className="sp-cards__item">
              <span className="sp-cards__body">
                <span className="sp-cards__title">{t.name}</span>
                <span className="sp-cards__meta">
                  {statusLabel[t.status]} ·{' '}
                  {t.publishedVersion ? `Bản ${t.publishedVersion.number}` : 'Chưa xuất bản'}
                  {t.draft && ' · có bản nháp'}
                </span>
                <span className="sp-cards__meta">
                  {t.publishedVersion?.tenantsCreated ?? 0} cơ sở đã tạo
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="sp-form-section__desc m-0">
        &ldquo;Sắp có&rdquo;: thẻ ngành hiện ở bước đăng ký nhưng chưa chọn được. Sửa một gói chỉ áp
        cho cơ sở tạo sau khi xuất bản; cơ sở đã tạo giữ bản của mình (BR-70).
      </p>
    </div>
  );
}
