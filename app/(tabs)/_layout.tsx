import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/onboarding" />;

  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}
