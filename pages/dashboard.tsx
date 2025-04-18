import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      } else {
        setUser(session.user);
      }
    };
    getSession();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard | To-Do & Habit Tracker</title>
      </Head>
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
          <button
            onClick={signOut}
            className="bg-red-500 text-white rounded px-4 py-2"
          >
            Sign Out
          </button>
        </div>
        <p>Your dashboard goes here.</p>
      </main>
    </>
  );
}

// Mark this page as requiring authentication
(Dashboard as any).auth = true;

export default Dashboard;