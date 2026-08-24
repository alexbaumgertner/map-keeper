'use client';

import { Suspense, type PropsWithChildren } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DragGhost,
  UuiContext,
  useNextAppRouter,
  useUuiServices,
} from '@epam/uui-core';
import { Modals } from '@epam/uui-components';
import { ErrorHandler, Snackbar } from '@epam/loveship';

function UuiServices({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routerAdapter = useNextAppRouter({ router, pathname, searchParams });
  const { services } = useUuiServices({ router: routerAdapter });

  return (
    <UuiContext.Provider value={services}>
      <ErrorHandler>
        {children}
        <Snackbar />
        <Modals />
        <DragGhost />
      </ErrorHandler>
    </UuiContext.Provider>
  );
}

/** Client UUI provider required for Loveship controls (Next App Router). */
export function UuiProvider({ children }: PropsWithChildren) {
  return (
    <Suspense fallback={null}>
      <UuiServices>{children}</UuiServices>
    </Suspense>
  );
}
