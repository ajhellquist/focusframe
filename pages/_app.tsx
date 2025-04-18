import "../styles/globals.css";
import React from "react";
import type { AppProps } from "next/app";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import Layout from "../components/Layout";

function InnerApp({ Component, pageProps }: AppProps) {
  const { user, loading } = useAuth();
  const requireAuth = (Component as any).auth;

  if (requireAuth) {
    if (loading) return null;
    if (!user) return null;
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
    <AuthProvider>
      <InnerApp {...props} />
    </AuthProvider>
  );
}