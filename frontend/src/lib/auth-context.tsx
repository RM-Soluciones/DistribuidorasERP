import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const DEFAULT_AUTH_EMAIL_DOMAIN = "example.com";

function normalizeAuthEmail(identifier: string) {
  const trimmed = identifier.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${DEFAULT_AUTH_EMAIL_DOMAIN}`;
}

export type UserModules = {
  pos?: boolean;
  deliveries?: boolean;
  purchases?: boolean;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin" | "seller" | "delivery";
  phone?: string | null;
  address?: string | null;
  modules?: UserModules;
  createdAt: string;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile | null>;
  signUp: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    role?: "customer" | "seller" | "delivery";
    modules?: UserModules;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(email: string): Promise<UserProfile | null> {
  const normalizedEmail = normalizeAuthEmail(email);
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    phone: data.phone,
    address: data.address,
    modules: data.modules ?? {},
    createdAt: data.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchProfile(session.user.email)
          .then(setProfile)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchProfile(session.user.email).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<UserProfile | null> => {
    const normalizedEmail = normalizeAuthEmail(email);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw new Error(error.message);
    const p = await fetchProfile(normalizedEmail);
    setProfile(p);
    return p;
  };

  const signUp = async ({
    email,
    password,
    name,
    phone,
    address,
    role,
    modules,
  }: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    role?: "customer" | "seller" | "delivery";
    modules?: UserModules;
  }) => {
    const normalizedEmail = normalizeAuthEmail(email);
    const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) throw new Error(error.message);

    const { error: upsertError } = await supabase.from("users").upsert(
      {
        name,
        email: normalizedEmail,
        password_hash: "SUPABASE_AUTH",
        role: role ?? "customer",
        phone: phone || null,
        address: address || null,
        modules: modules ?? { pos: true, deliveries: true, purchases: true },
      },
      { onConflict: "email" }
    );

    if (upsertError) throw new Error(upsertError.message);
    const p = await fetchProfile(normalizedEmail);
    setProfile(p);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
