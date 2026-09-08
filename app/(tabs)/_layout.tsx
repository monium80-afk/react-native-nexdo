import { useAuth, useUser } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";

import { TabBar } from "@/components/TabBar";
import { posthog } from "@/lib/posthog";
import { setClerkTokenGetter } from "@/lib/supabase";
import { useChatStore } from "@/store/useChatStore";
import { useTaskStore } from "@/store/useTaskStore";

export default function TabsLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const userId = user?.id;
  const hydrateTasks = useTaskStore((state) => state.hydrateFromSupabase);
  const subscribeTasks = useTaskStore((state) => state.subscribeToRealtime);
  const unsubscribeTasks = useTaskStore((state) => state.unsubscribeFromRealtime);
  const hydrateChat = useChatStore((state) => state.hydrateFromSupabase);
  const subscribeChat = useChatStore((state) => state.subscribeToRealtime);
  const unsubscribeChat = useChatStore((state) => state.unsubscribeFromRealtime);

  // Identify the user with PostHog when they are signed in (catches both
  // fresh logins and returning sessions that are already authenticated).
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        $set: {
          first_name: user.firstName ?? null,
          last_name: user.lastName ?? null,
          created_at: user.createdAt?.toISOString() ?? null,
        },
        $set_once: {
          account_created_at: user.createdAt?.toISOString() ?? null,
        },
      })
    }
  }, [user])

  // Bridge Clerk's session token to Supabase (Clerk is registered there as a
  // Third-Party Auth provider), then pull this user's tasks/chat down and
  // subscribe to live changes for cross-device sync.
  useEffect(() => {
    if (!userId) return;
    let isActive = true;
    setClerkTokenGetter(() => getToken());
    hydrateTasks(userId).then(() => {
      if (isActive) subscribeTasks(userId);
    });
    hydrateChat(userId).then(() => {
      if (isActive) subscribeChat(userId);
    });

    return () => {
      isActive = false;
      unsubscribeTasks();
      unsubscribeChat();
    };
  }, [userId, getToken, hydrateTasks, subscribeTasks, unsubscribeTasks, hydrateChat, subscribeChat, unsubscribeChat]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Next" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="add" options={{ title: "Add" }} />
      <Tabs.Screen name="ai-chat" options={{ title: "Inbox" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
