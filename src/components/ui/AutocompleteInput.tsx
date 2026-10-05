import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { inputVariants } from '@cloudflare/kumo';
import { IconChevronDown } from './icons';

interface AutocompleteInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label?: string }[];
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  id?: string;
  rightElement?: ReactNode;
}

export function AutocompleteInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  hint,
  error,
  className = '',
  wrapperClassName = '',
  wrapperStyle,
  id,
  rightElement,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string'
      ? { value: opt, label: opt }
      : { value: opt.value, label: opt.label || opt.value }
  );

  const filteredOptions = normalizedOptions.filter((opt) => {
    const v = value.toLowerCase();
    return (
      opt.value.toLowerCase().includes(v) || (opt.label && opt.label.toLowerCase().includes(v))
    );
  });
  const showDropdown = isOpen && filteredOptions.length > 0 && !disabled;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!showDropdown || !inputWrapRef.current) return;
    const updateDropdownStyle = () => {
      if (!inputWrapRef.current) return;
      const rect = inputWrapRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 14;
      const opensUp = spaceBelow < 200 && rect.top > spaceBelow;
      setDropdownStyle({
        position: 'fixed',
        ...(opensUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(0, Math.min(200, opensUp ? rect.top - 14 : spaceBelow)),
        zIndex: 2010,
      });
    };
    updateDropdownStyle();
    window.addEventListener('resize', updateDropdownStyle);
    window.addEventListener('scroll', updateDropdownStyle, true);

    return () => {
      window.removeEventListener('resize', updateDropdownStyle);
      window.removeEventListener('scroll', updateDropdownStyle, true);
    };
  }, [showDropdown]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`form-group ${wrapperClassName}`} ref={containerRef} style={wrapperStyle}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="relative" ref={inputWrapRef}>
        <input
          id={id}
          className={[inputVariants(), 'input !w-full pr-9', className].filter(Boolean).join(' ')}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        <div
          className={[
            'absolute top-0 right-2 flex h-full items-center gap-1 text-kumo-subtle',
            disabled ? 'pointer-events-none' : 'cursor-pointer',
          ].join(' ')}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {rightElement}
          <IconChevronDown size={16} />
        </div>

        {showDropdown &&
          dropdownStyle &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={dropdownRef}
              className="autocomplete-dropdown overflow-y-auto rounded-lg bg-kumo-base p-1.5 text-kumo-default shadow-lg ring ring-kumo-line"
              style={dropdownStyle}
            >
              {filteredOptions.map((opt, index) => (
                <div
                  key={`${opt.value}-${index}`}
                  onClick={() => handleSelect(opt.value)}
                  className={[
                    'flex cursor-pointer flex-col rounded-md px-2.5 py-1.5 text-base',
                    index === highlightedIndex ? 'bg-kumo-tint' : '',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="font-medium">{opt.value}</span>
                  {opt.label && opt.label !== opt.value && (
                    <span className="text-sm text-kumo-subtle">
                      {opt.label}
                    </span>
                  )}
                </div>
              ))}
            </div>,
            document.body
          )}
      </div>
      {hint && <div className="hint">{hint}</div>}
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
