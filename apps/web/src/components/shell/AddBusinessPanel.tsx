'use client';

import { useMemo } from 'react';
import {
  Button,
  FlexRow,
  FlexSpacer,
  IconButton,
  LabeledInput,
  TabButton,
  Text,
  TextInput,
} from '@epam/loveship';
import {
  categoryForVertical,
  typesForCategory,
  verticalForCategory,
  type CategoryTab,
} from '@/lib/places/business-types';
import { iconArrowRight, iconClose } from './icons';

export type AddBusinessFormState = {
  category: CategoryTab;
  displayName: string;
  properName: string;
  businessType: string | null;
  externalPageUrl: string;
  lat: number | null;
  lon: number | null;
};

export type AddBusinessPanelProps = {
  value: AddBusinessFormState;
  onChange: (next: AddBusinessFormState) => void;
  onClose: () => void;
  onNext: () => void;
  nextBusy?: boolean;
};

function formatCoords(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)} ${ns}, ${Math.abs(lon).toFixed(4)} ${ew}`;
}

export function AddBusinessPanel({ value, onChange, onClose, onNext, nextBusy }: AddBusinessPanelProps) {
  const types = typesForCategory(value.category);

  const canNext = Boolean(
    value.displayName.trim() &&
      value.properName.trim() &&
      value.businessType &&
      value.lat != null &&
      value.lon != null,
  );

  const locationLabel = useMemo(() => {
    if (value.lat == null || value.lon == null) return 'Click to the map to point the location.';
    return formatCoords(value.lat, value.lon);
  }, [value.lat, value.lon]);

  function setCategory(category: CategoryTab) {
    const nextTypes = typesForCategory(category);
    const keep = nextTypes.some((t) => t.id === value.businessType);
    onChange({
      ...value,
      category,
      businessType: keep ? value.businessType : nextTypes[0]?.id ?? null,
    });
  }

  return (
    <aside className="map-watcher-panel flex h-full w-full max-w-[400px] shrink-0 flex-col gap-4 bg-white p-6 shadow-[0_0_3px_rgba(29,30,38,0.05),0_3px_6px_rgba(29,30,38,0.1)]">
      <FlexRow cx="w-full items-center">
        <Text fontSize="24" lineHeight="30" color="primary" cx="font-semibold">
          Add a Business
        </Text>
        <FlexSpacer />
        <IconButton icon={iconClose} color="secondary" onClick={onClose} />
      </FlexRow>

      <FlexRow cx="w-full">
        <TabButton caption="Housing" size="36" isActive={value.category === 'housing'} onClick={() => setCategory('housing')} />
        <TabButton caption="Food" size="36" isActive={value.category === 'food'} onClick={() => setCategory('food')} />
      </FlexRow>

      <LabeledInput label="Full name" info="E. g. Guest House Cozy Nest.">
        <TextInput
          value={value.displayName}
          onValueChange={(displayName) => onChange({ ...value, displayName: displayName ?? '' })}
          placeholder="Enter a text."
          size="48"
        />
      </LabeledInput>

      <LabeledInput label="Pure proper name" info="Pure proper name without type, e. g. Cozy Nest.">
        <TextInput
          value={value.properName}
          onValueChange={(properName) => onChange({ ...value, properName: properName ?? '' })}
          placeholder="Enter a text."
          size="48"
        />
      </LabeledInput>

      <LabeledInput label="Business type">
        <select
          className="h-12 w-full rounded border border-[#ced0db] bg-white px-3 text-base"
          value={value.businessType ?? ''}
          onChange={(e) => onChange({ ...value, businessType: e.target.value || null })}
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </LabeledInput>

      <div>
        <Text fontSize="14" color="secondary" cx="mb-1">
          Location
        </Text>
        <Text fontSize="16" color={value.lat == null ? 'tertiary' : 'primary'}>
          {locationLabel}
        </Text>
      </div>

      <hr className="border-stone-200" />

      <Text fontSize="14" color="secondary">
        Already have page on Booking, Airbnb, etc? Paste it below to grab info.
      </Text>
      <TextInput
        value={value.externalPageUrl}
        onValueChange={(externalPageUrl) => onChange({ ...value, externalPageUrl: externalPageUrl ?? '' })}
        placeholder="Link to page."
        size="48"
      />

      <FlexSpacer />

      <Button
        color="grass"
        size="48"
        caption="Next"
        icon={iconArrowRight}
        iconPosition="right"
        isDisabled={!canNext || nextBusy}
        onClick={onNext}
        cx="w-full"
      />
    </aside>
  );
}

export function emptyAddBusinessForm(): AddBusinessFormState {
  return {
    category: 'housing',
    displayName: '',
    properName: '',
    businessType: typesForCategory('housing')[0]?.id ?? null,
    externalPageUrl: '',
    lat: null,
    lon: null,
  };
}

export function formFromPlace(place: {
  vertical?: string;
  displayName?: string;
  properName?: string;
  businessType?: string;
  externalPageUrl?: string;
  lat?: number;
  lon?: number;
}): AddBusinessFormState {
  const category = categoryForVertical(place.vertical ?? 'accommodation');
  return {
    category,
    displayName: place.displayName && place.displayName !== 'Untitled draft' ? place.displayName : '',
    properName: place.properName ?? '',
    businessType: place.businessType ?? typesForCategory(category)[0]?.id ?? null,
    externalPageUrl: place.externalPageUrl ?? '',
    lat: place.lat ?? null,
    lon: place.lon ?? null,
  };
}

export { verticalForCategory };
