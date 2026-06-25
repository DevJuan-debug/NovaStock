"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMEOUTS: Record<string, number> = {
  ADMIN: 10 * 60 * 1000,        // 10 minutos
  CAJERO: 8 * 60 * 60 * 1000,   // 8 horas
};

const ACTIVITY_KEY = "nova_last_activity";
const CHECK_INTERVAL = 30_000; // revisa cada 30 seg

export function SessionTimeout({ role }: { role: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timeout = TIMEOUTS[role];
    if (!timeout) return; // rol sin restricción configurada, no hace nada

    const touch = () => localStorage.setItem(ACTIVITY_KEY, Date.now().toString());

    // Inicializa la actividad al montar
    touch();

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    timerRef.current = setInterval(async () => {
      const last = parseInt(localStorage.getItem(ACTIVITY_KEY) ?? "0", 10);
      if (Date.now() - last >= timeout) {
        clearInterval(timerRef.current!);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/login");
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [role, router]);

  return null;
}
