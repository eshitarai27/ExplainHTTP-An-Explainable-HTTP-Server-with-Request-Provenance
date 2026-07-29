import type { HTMLAttributes } from "react";

export default function Panel({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark ${className}`}
      {...rest}
    />
  );
}
