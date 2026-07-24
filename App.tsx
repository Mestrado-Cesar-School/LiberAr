import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BottomNav, TabKey } from "./src/components/BottomNav";
import { PanicModal } from "./src/components/PanicModal";
import { AppProvider, useApp } from "./src/context/AppContext";
import { Article } from "./src/data/articles";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { ArticleScreen } from "./src/screens/ArticleScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { EvolutionScreen } from "./src/screens/EvolutionScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InfoScreen } from "./src/screens/InfoScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { TermsScreen } from "./src/screens/TermsScreen";
import { UbsLocatorScreen } from "./src/screens/UbsLocatorScreen";
import { colors } from "./src/theme/colors";

// Telas que cobrem as abas (empilhadas por cima da navegação principal).
type Overlay = "checkin" | "achievements" | "ubs" | "evolution" | "terms" | "article" | null;

function Root() {
  const { loading, profile } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.teal500} />
      </View>
    );
  }

  // Fluxo 1 do diagrama: sem perfil, o usuário passa pelo onboarding.
  if (!profile) {
    return <OnboardingScreen />;
  }

  const closeOverlay = () => setOverlay(null);

  const renderOverlay = () => {
    switch (overlay) {
      case "checkin":
        return <CheckInScreen onClose={closeOverlay} />;
      case "achievements":
        return <AchievementsScreen onClose={closeOverlay} />;
      case "ubs":
        return <UbsLocatorScreen onClose={closeOverlay} />;
      case "evolution":
        return <EvolutionScreen onClose={closeOverlay} />;
      case "terms":
        return <TermsScreen onClose={closeOverlay} />;
      case "article":
        return activeArticle ? (
          <ArticleScreen article={activeArticle} onClose={closeOverlay} />
        ) : null;
      default:
        return null;
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "chat":
        return <ChatScreen />;
      case "info":
        return (
          <InfoScreen
            onOpenUbsLocator={() => setOverlay("ubs")}
            onOpenArticle={(article) => {
              setActiveArticle(article);
              setOverlay("article");
            }}
          />
        );
      case "profile":
        return (
          <ProfileScreen
            onOpenEvolution={() => setOverlay("evolution")}
            onOpenTerms={() => setOverlay("terms")}
          />
        );
      case "home":
      default:
        return (
          <HomeScreen
            onOpenCheckIn={() => setOverlay("checkin")}
            onOpenAchievements={() => setOverlay("achievements")}
            onOpenEvolution={() => setOverlay("evolution")}
          />
        );
    }
  };

  return (
    <>
      <View style={styles.screen}>{overlay ? renderOverlay() : renderTab()}</View>

      {!overlay && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onPanicPress={() => setShowPanicModal(true)}
        />
      )}

      <PanicModal visible={showPanicModal} onClose={() => setShowPanicModal(false)} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar style="dark" />
          <Root />
        </SafeAreaView>
      </SafeAreaProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate50,
  },
});
