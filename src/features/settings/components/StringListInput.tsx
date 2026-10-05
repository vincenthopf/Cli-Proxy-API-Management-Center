import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@cloudflare/kumo';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { makeClientId } from '@/types/visualConfig';

export type StringListInputProps = {
  value: string[];
  disabled?: boolean;
  placeholder?: string;
  itemLabel: string;
  invalid?: boolean;
  onChange: (next: string[]) => void;
};

export function StringListInput({
  value,
  disabled,
  placeholder,
  itemLabel,
  invalid = false,
  onChange,
}: StringListInputProps) {
  const { t } = useTranslation();
  const [itemIds, setItemIds] = useState(() => value.map(() => makeClientId()));
  const renderIds = useMemo(() => {
    if (itemIds.length === value.length) return itemIds;
    if (itemIds.length > value.length) return itemIds.slice(0, value.length);
    return [
      ...itemIds,
      ...Array.from({ length: value.length - itemIds.length }, () => makeClientId()),
    ];
  }, [itemIds, value.length]);

  const update = (index: number, next: string) =>
    onChange(value.map((item, i) => (i === index ? next : item)));
  const add = () => {
    setItemIds([...renderIds, makeClientId()]);
    onChange([...value, '']);
  };
  const remove = (index: number) => {
    setItemIds(renderIds.filter((_, i) => i !== index));
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((item, index) => (
        <div key={renderIds[index] ?? index} className="flex items-center gap-2">
          <Input
            className="w-full min-w-0 flex-1"
            aria-label={`${itemLabel} ${index + 1}`}
            aria-invalid={invalid || undefined}
            placeholder={placeholder}
            value={item}
            disabled={disabled}
            onChange={(event) => update(index, event.target.value)}
          />
          <Button
            variant="ghost"
            shape="square"
            icon={<TrashIcon />}
            aria-label={t('settings.list.remove_item', { label: itemLabel, index: index + 1 })}
            disabled={disabled}
            onClick={() => remove(index)}
          />
        </div>
      ))}
      <div>
        <Button variant="secondary" size="sm" icon={<PlusIcon />} disabled={disabled} onClick={add}>
          {t('settings.list.add')}
        </Button>
      </div>
    </div>
  );
}
