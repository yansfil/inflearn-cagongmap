import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * 네이티브 <select> 기반의 가벼운 셀렉트.
 * enum 필드(콘센트/와이파이/소음/작업적합도) 입력에 쓴다.
 * (Radix Select 의 포털/스코프 복잡도를 피하기 위해 네이티브를 감쌌다.)
 */
export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export { Select };
