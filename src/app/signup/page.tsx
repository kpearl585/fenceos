import { signup } from "../login/actions";
import Link from "next/link";

export default async function SignupPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-fence-950">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-fence-900 mb-6 text-center">
          Create your FenceOS account
        </h1>

        {searchParams?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {searchParams.error}
          </div>
        )}

        {searchParams?.message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {searchParams.message}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-fence-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-fence-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            formAction={signup}
            className="w-full py-2.5 px-4 bg-fence-600 hover:bg-fence-700 text-white font-medium rounded-lg transition-colors"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fence-600">
          Already have an account?{" "}
          <Link href="/login" className="text-fence-500 hover:text-fence-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
