import { redirect } from 'next/navigation';

/**
 * Signup page - redirects to /auth/login with signup mode
 *
 * The login page handles both login and signup via magic link/OAuth.
 * This redirect ensures pricing page links work correctly.
 */
export default function SignupPage() {
  redirect('/auth/login?mode=signup');
}
