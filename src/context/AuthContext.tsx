import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, role: UserRole, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState<boolean>(true);
  const [configured, setConfigured] = useState<boolean>(isSupabaseConfigured());

  const fetchProfile = async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as Profile);
        setActiveRole(data.role || 'worker');
      } else {
        // Fallback default admin profile if user just registered
        const newProf: Profile = {
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || 'Админ хэрэглэгч',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(newProf);
        setActiveRole('admin');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
    const supabase = getSupabase();

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase холболт тохируулаагүй байна. Админ тохиргоо руу орж холбоно уу.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
        return { success: true };
      }
      return { success: false, error: 'Нэвтрэхэд алдаа гарлаа' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Нэвтрэх явцад алдаа гарлаа' };
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase тохируулаагүй байна.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            phone,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Insert into public.profiles
        const { error: pError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            email,
            full_name: fullName,
            role,
            phone: phone || null,
            is_active: true,
          },
        ]);

        if (pError) {
          console.warn('Profile creation note:', pError.message);
        }

        setUser(data.user);
        await fetchProfile(data.user.id);
        return { success: true };
      }
      return { success: false, error: 'Бүртгэл амжилтгүй боллоо' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Бүртгэлийн явцад алдаа гарлаа' };
    }
  };

  const logout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const switchActiveRole = (newRole: UserRole) => {
    setActiveRole(newRole);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
    setConfigured(isSupabaseConfigured());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: activeRole,
        loading,
        configured,
        login,
        register,
        logout,
        switchActiveRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
