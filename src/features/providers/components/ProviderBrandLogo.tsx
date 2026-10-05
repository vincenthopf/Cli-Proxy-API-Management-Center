import type { ProviderBrandLogo as ProviderBrandLogoData } from '../brandLogos';

interface ProviderBrandLogoProps {
  logo: ProviderBrandLogoData | undefined;
  size?: 'sm' | 'md';
}

const join = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

export function ProviderBrandLogo({ logo, size = 'md' }: ProviderBrandLogoProps) {
  if (!logo) return null;
  const base = join(
    'shrink-0 rounded-md object-contain',
    size === 'sm' ? 'size-6' : 'size-7',
    logo.themeSurface
      ? 'bg-kumo-contrast p-1'
      : logo.transparent
        ? ''
        : 'bg-kumo-recessed p-0.5'
  );
  return (
    <>
      <img
        src={logo.src}
        alt=""
        aria-hidden="true"
        className={join(
          base,
          logo.darkSrc && 'in-data-[mode=dark]:hidden',
          logo.invertOnDark && 'in-data-[mode=dark]:invert in-data-[mode=dark]:hue-rotate-180'
        )}
      />
      {logo.darkSrc ? (
        <img
          src={logo.darkSrc}
          alt=""
          aria-hidden="true"
          className={join(base, 'hidden in-data-[mode=dark]:block')}
        />
      ) : null}
    </>
  );
}
