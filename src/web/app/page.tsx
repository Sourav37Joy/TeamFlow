import { redirect } from 'next/navigation';

// The dashboard is the landing route: the three standing questions are what anybody opening
// the tool came to ask (FR-072, T075).
export default function Home() {
  redirect('/dashboard');
}
