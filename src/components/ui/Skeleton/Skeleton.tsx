import type { CSSProperties, HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
}

export function Skeleton({ width, height, rounded, className, style, ...rest }: SkeletonProps) {
  const merged: CSSProperties = {
    ...style,
    width: width ?? style?.width,
    height: height ?? style?.height,
    borderRadius: rounded ?? style?.borderRadius,
  };
  const cls = ['skeleton block rounded-md bg-kumo-fill motion-reduce:animate-none', className]
    .filter(Boolean)
    .join(' ');
  return <div className={cls} style={merged} aria-hidden="true" {...rest} />;
}
