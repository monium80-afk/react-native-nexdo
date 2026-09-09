import { useAuth, useUser } from "@clerk/expo";
import { useEffect } from "react";

import { setClerkTokenGetter } from "@/lib/supabase";
import { useChatStore } from "@/store/useChatStore";
import { useTaskStore } from "@/store/useTaskStore";

export function useAuthSync() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const userId = user?.id;
  const hydrateTasks = useTaskStore((state) => state.hydrateFromSupabase);
  const subscribeTasks = useTaskStore((state) => state.subscribeToRealtime);
  const unsubscribeTasks = useTaskStore((state) => state.unsubscribeFromRealtime);
  const hydrateChat = useChatStore((state) => state.hydrateFromSupabase);
  const subscribeChat = useChatStore((state) => state.subscribeToRealtime);
  const unsubscribeChat = useChatStore((state) => state.unsubscribeFromRealtime);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;
    setClerkTokenGetter(() => getToken());

    hydrateTasks(userId).then(() => {
      if (isActive && useTaskStore.getState().syncUserId === userId) subscribeTasks(userId);
    });
    hydrateChat(userId).then(() => {
      if (isActive && useChatStore.getState().syncUserId === userId) subscribeChat(userId);
    });

    return () => {
      isActive = false;
      unsubscribeTasks();
      unsubscribeChat();
    };
  }, [userId, getToken, hydrateTasks, subscribeTasks, unsubscribeTasks, hydrateChat, subscribeChat, unsubscribeChat]);
}