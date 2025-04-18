import Head from "next/head";
import { supabase } from "../lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) console.error("Error signing in:", error);
    else {
      console.log("Signed in:", data);
      router.push("/dashboard");
    }
  };

  return (
    <>
      <Head>
        <title>To-Do & Habit Tracker</title>
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold mb-6">Sign In</h1>
        <div className="flex flex-col w-full max-w-sm">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded p-2 mb-4"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded p-2 mb-6"
          />
          <button onClick={signIn} className="bg-blue-600 text-white rounded py-2">
            Sign In
          </button>
          <p className="mt-4 text-center">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 underline">
              Sign up
            </a>
          </p>
        </div>
      </main>
    </>
  );
}