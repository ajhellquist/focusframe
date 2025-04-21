import "../styles/globals.css";
import React from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import favicon from "../focusframelogosimple.png";
import type { AppProps } from "next/app";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import Layout from "../components/Layout";

function InnerApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const requireAuth = (Component as any).auth;

  if (requireAuth) {
    if (loading) return null;
    if (!user) {
      // Redirect unauthenticated users to home
      router.push("/");
      return null;
    }
    return (
      <Layout>
        <Component {...pageProps} />
      </Layout>
    );
  }

  return <Component {...pageProps} />;
}

export default function MyApp(props: AppProps) {
  return (
    <>
      <Head>
        <title>FocusFrame</title>
        <link rel="icon" href={favicon.src} />
      </Head>
      <AuthProvider>
        <InnerApp {...props} />
      </AuthProvider>
    </>
  );
}