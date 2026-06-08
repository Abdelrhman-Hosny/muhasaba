import { Redirect } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { user$ } from '@/state/auth';

export default function Index() {
  const user = use$(user$);
  return <Redirect href={user ? '/(tabs)' : '/sign-in'} />;
}
