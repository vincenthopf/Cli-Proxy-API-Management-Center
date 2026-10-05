import { Loader } from '@cloudflare/kumo';

export function LoadingSpinner({
  size = 20,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={['inline-flex text-kumo-subtle', className].filter(Boolean).join(' ')} aria-live="polite">
      <Loader size={size} />
    </span>
  );
}
