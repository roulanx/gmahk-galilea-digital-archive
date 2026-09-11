import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Seamless redirect to home page; authentication entry is exclusively the [ MASUK ] button on the navbar
  redirect('/');
}

