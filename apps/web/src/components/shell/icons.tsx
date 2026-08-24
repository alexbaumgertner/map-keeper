import type { Icon } from '@epam/uui-core';

/** Minimal inline icons for Map Watcher chrome (no separate icon package). */
function svgIcon(path: string): Icon {
  const Cmp = (props: { className?: string }) => (
    <svg
      className={props.className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
  return Cmp as Icon;
}

export const iconPlus = svgIcon('M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z');
export const iconMinus = svgIcon('M5 11h14v2H5v-2z');
export const iconSearch = svgIcon(
  'M10 4a6 6 0 104.472 10.03l4.25 4.25 1.414-1.414-4.25-4.25A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z',
);
export const iconTarget = svgIcon(
  'M12 8a4 4 0 100 8 4 4 0 000-8zm0-6a1 1 0 011 1v2.06A7.002 7.002 0 0118.94 11H21a1 1 0 110 2h-2.06A7.002 7.002 0 0113 18.94V21a1 1 0 11-2 0v-2.06A7.002 7.002 0 015.06 13H3a1 1 0 110-2h2.06A7.002 7.002 0 0111 5.06V3a1 1 0 011-1z',
);
export const iconClose = svgIcon(
  'M6.7 5.3L12 10.6l5.3-5.3 1.4 1.4L13.4 12l5.3 5.3-1.4 1.4L12 13.4l-5.3 5.3-1.4-1.4L10.6 12 5.3 6.7l1.4-1.4z',
);
export const iconAdd = svgIcon('M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z');
export const iconArrowRight = svgIcon('M13.2 5.6l1.4-1.4L21 12l-6.4 7.8-1.4-1.4L17.2 13H3v-2h14.2l-3.99-5.4z');
