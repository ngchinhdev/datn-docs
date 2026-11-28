'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import { SidePanel } from '@/components/sapio/side-panel';
import { cleanName } from '@/mock/branch-settings';
import type { Service } from '@/mock/fixtures';
import {
  groupCounts,
  groupDeleteBlock,
  groupNameProblem,
  LIMITS,
  moveGroup,
  OTHER_GROUP,
  removeGroup,
  renameGroup,
} from '@/mock/service-settings';

/**
 * "Nhóm dịch vụ": add, rename, move and delete a group (BR-94.3 to BR-94.7). A group with services
 * in use cannot be deleted; "Khác" holds the services with no group and has no buttons.
 */
export function ServiceGroupsPanel({
  groups,
  services,
  onChange,
  onClose,
}: {
  groups: string[];
  services: Service[];
  onChange: (groups: string[], services: Service[] | undefined, toast?: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ name: string; value: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function add() {
    const problem = groupNameProblem(groups, adding);
    if (problem) return setAddError(problem);
    const name = cleanName(adding);
    onChange([...groups, name], undefined, `Đã thêm nhóm ${name}.`);
    setAdding('');
    setAddError(null);
  }

  function rename() {
    if (!renaming) return;
    const problem = groupNameProblem(groups, renaming.value, renaming.name);
    if (problem) return setRenameError(problem);
    const name = cleanName(renaming.value);
    onChange(
      groups.map((g) => (g === renaming.name ? name : g)),
      renameGroup(services, renaming.name, name),
      `Đã đổi tên thành ${name}.`,
    );
    setRenaming(null);
    setRenameError(null);
  }

  const other = groupCounts(services, '');

  return (
    <SidePanel
      title="Nhóm dịch vụ"
      onClose={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      <ul className="m-0 flex list-none flex-col gap-(--space-3) p-0">
        {groups.map((g, i) => {
          const counts = groupCounts(services, g);
          const block = groupDeleteBlock(services, g);
          return (
            <li key={g} className="flex flex-col gap-1">
              {renaming?.name === g ? (
                <div className="flex flex-col gap-2">
                  <Field id={`sg-${i}`} label={`Tên nhóm ${g}`} error={renameError ?? undefined}>
                    <input
                      id={`sg-${i}`}
                      maxLength={LIMITS.groupName}
                      value={renaming.value}
                      onChange={(e) => {
                        setRenaming({ name: g, value: e.target.value });
                        setRenameError(null);
                      }}
                    />
                  </Field>
                  <span className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={rename}>
                      Lưu
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setRenaming(null);
                        setRenameError(null);
                      }}
                    >
                      Hủy
                    </Button>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-auto">
                    <strong className="block truncate">{g}</strong>
                    <span className="sp-table__secondary">
                      {counts.active} dịch vụ
                      {counts.archived > 0 ? `, ${counts.archived} đã ngừng dùng` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="sp-icon-btn"
                    aria-label={`Lên: nhóm ${g}`}
                    disabled={i === 0}
                    onClick={() => onChange(moveGroup(groups, g, -1), undefined)}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="sp-icon-btn"
                    aria-label={`Xuống: nhóm ${g}`}
                    disabled={i === groups.length - 1}
                    onClick={() => onChange(moveGroup(groups, g, 1), undefined)}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenaming({ name: g, value: g });
                      setRenameError(null);
                    }}
                  >
                    Đổi tên
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={block !== null}
                    title={block ?? undefined}
                    onClick={() => setDeleting(g)}
                  >
                    Xóa
                  </Button>
                </div>
              )}
              {block && renaming?.name !== g && (
                <span className="sp-table__secondary">{block}</span>
              )}
            </li>
          );
        })}
        <li className="flex flex-col gap-1">
          <strong>{OTHER_GROUP}</strong>
          <span className="sp-table__secondary">
            Dịch vụ không thuộc nhóm nào · {other.active} dịch vụ
            {other.archived > 0 ? `, ${other.archived} đã ngừng dùng` : ''}
          </span>
        </li>
      </ul>
      <Field id="sg-new" label="Thêm nhóm" error={addError ?? undefined}>
        <input
          id="sg-new"
          maxLength={LIMITS.groupName}
          placeholder="Ví dụ: Phục hồi"
          autoComplete="off"
          value={adding}
          aria-invalid={addError ? true : undefined}
          onChange={(e) => {
            setAdding(e.target.value);
            setAddError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
      </Field>
      <Button variant="primary" onClick={add}>
        Thêm nhóm
      </Button>
      {deleting && (
        <ConfirmDialog
          open
          title={`Xóa nhóm ${deleting}?`}
          body={
            groupCounts(services, deleting).archived > 0
              ? `Dịch vụ đã ngừng dùng của nhóm này chuyển sang "${OTHER_GROUP}".`
              : undefined
          }
          confirmLabel="Xóa"
          backLabel="Quay lại"
          tone="danger"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onChange(
              groups.filter((g) => g !== deleting),
              removeGroup(services, deleting),
              `Đã xóa nhóm ${deleting}.`,
            );
            setDeleting(null);
          }}
        />
      )}
    </SidePanel>
  );
}
