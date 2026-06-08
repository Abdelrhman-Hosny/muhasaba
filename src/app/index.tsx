import { Redirect } from 'expo-router';
import { useObs } from '@/state/useObs';
import { user$ } from '@/state/auth';

export default function Index() {
  const user = useObs(user$);
  return <Redirect href={user ? '/(tabs)' : '/sign-in'} />;
}
