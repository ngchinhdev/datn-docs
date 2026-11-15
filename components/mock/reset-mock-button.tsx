'use client';

import { Button } from '@/components/ui/button';
import { resetMockData } from '@/mock/persist';

/** Forgets what the tab kept and loads the sample data again. */
export function ResetMockButton() {
  return (
    <Button type="button" variant="outline" size="sm" onClick={resetMockData}>
      Đặt lại dữ liệu mock
    </Button>
  );
}
