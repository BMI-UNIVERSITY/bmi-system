// Ambient module declaration for lucide-react v1.x which does not ship bundled TypeScript types.
// Add specific icon types here as needed.
declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
  };

  export type LucideIcon = FC<LucideProps>;

  export const Loader2: LucideIcon;
  // Add more icons here if imported elsewhere in @bmi/ui
}
