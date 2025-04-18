import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const signUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setErrorMsg(error.message);
    else {
      console.log("Sign-up success:", data);
      router.push("/");
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | To-Do & Habit Tracker</title>
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold mb-6">Create an Account</h1>
        <div className="flex flex-col w-full max-w-sm">
          {errorMsg && (
            <p className="text-red-600 mb-4">{errorMsg}</p>
          )}
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
          <button
            onClick={signUp}
            className="bg-green-600 text-white rounded py-2 mb-4"
          >
            Sign Up
          </button>
          <p className="text-center">
            Already have an account?{' '}
            <a href="/" className="text-blue-600 underline">
              Sign in
            </a>
          </p>
        </div>
      </main>
    </>
  );
}