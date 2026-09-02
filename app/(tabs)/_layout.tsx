import { useAuth, useUser } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";

import { TabBar } from "@/components/TabBar";
import { posthog } from "@/lib/posthog";

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

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

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Next" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="add" options={{ title: "Add" }} />
      <Tabs.Screen name="ai-chat" options={{ title: "AI Chat" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
