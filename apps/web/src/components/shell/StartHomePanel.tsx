'use client';

import { Button, FlexRow, FlexSpacer, Text } from '@epam/loveship';
import { iconAdd } from './icons';

export type StartHomePanelProps = {
  isLoggedIn: boolean;
  displayName?: string | null;
  onAddBusiness: () => void;
  onSignUp: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function StartHomePanel({
  isLoggedIn,
  displayName,
  onAddBusiness,
  onSignUp,
  onLogin,
  onLogout,
}: StartHomePanelProps) {
  return (
    <aside className="map-watcher-panel flex h-full w-full max-w-[400px] shrink-0 flex-col gap-9 bg-white p-6 shadow-[0_0_3px_rgba(29,30,38,0.05),0_3px_6px_rgba(29,30,38,0.1)]">
      <Text fontSize="36" lineHeight="42" color="primary" cx="font-semibold">
        Map Watcher
      </Text>

      <div className="flex w-full flex-col items-center gap-2.5">
        <Button
          color="grass"
          size="60"
          caption="Add Business"
          icon={iconAdd}
          onClick={onAddBusiness}
          cx="w-full"
        />
        <Text fontSize="16" lineHeight="24" color="tertiary" cx="text-center">
          Adds business to Maps.me, Mapy.com, Osmand, Organic Maps and many other maps worldwide
        </Text>
      </div>

      <FlexSpacer />

      {isLoggedIn ? (
        <FlexRow columnGap={16} cx="w-full items-center">
          <Text fontSize="16" color="primary" cx="flex-1 truncate">
            {displayName ?? 'Signed in'}
          </Text>
          <Button color="secondary" fill="none" caption="Log out" onClick={onLogout} />
        </FlexRow>
      ) : (
        <FlexRow columnGap={16} cx="w-full">
          <Button color="sky" size="48" caption="Sign Up" onClick={onSignUp} cx="flex-1" />
          <Button color="secondary" fill="none" size="48" caption="Login" onClick={onLogin} cx="flex-1" />
        </FlexRow>
      )}
    </aside>
  );
}
