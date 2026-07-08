'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BodyPortalProps {
  children: React.ReactNode;
}

export function BodyPortal({ children }: BodyPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
}
