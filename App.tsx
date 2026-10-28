import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BottomNav, TabKey } from "./src/components/BottomNav";
import { PanicModal } from "./src/components/PanicModal";
import { TourOverlay } from "./src/components/TourOverlay";
import { AppProvider, useApp } from "./src/context/AppContext";
import { Article } from "./src/data/articles";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { ArticleScreen } from "./src/screens/ArticleScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { EditProfileScreen } from "./src/screens/EditProfileScreen";
import { EvolutionScreen } from "./src/screens/EvolutionScreen";
import { FagerstromTestScreen } from "./src/screens/FagerstromTestScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InfoScreen } from "./src/screens/InfoScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileRoute, ProfileScreen } from "./src/screens/ProfileScreen";
import { RelapseScreen } from "./src/screens/RelapseScreen";
import { ReminderSettingsScreen } from "./src/screens/ReminderSettingsScreen";
import { ReportScreen } from "./src/screens/ReportScreen";
import { TermsScreen } from "./src/screens/TermsScreen";
import { TreatmentScreen } from "./src/screens/TreatmentScreen";
import { TriggersScreen } from "./src/screens/TriggersScreen";
import { UbsLocatorScreen } from "./src/screens/UbsLocatorScreen";
import { colors } from "./src/theme/colors";

// Telas que cobrem as abas (empilhadas por cima da navegação principal).
type Overlay =
  | "checkin"
  | "relapse"
  | "achievements"
  | "ubs"
  | "evolution"
  | "article"
  | "fagerstrom"
  | ProfileRoute
  | null;

// Telas de acesso antes de existir um perfil (sem perfil carregado do cache
// nem sessão válida na API).
type AuthView = "onboarding" | "login" | "forgot";

function AuthFlow() {
  const [view, setView] = useState<AuthView>("onboarding");

  // O login e o cadastro passam pelo AppContext: quando a API devolve a
  // sessão e o snapshot, `profile` é preenchido e o Root troca para as abas.
  if (view === "login") {
    return <LoginScreen onClose={() => setView("onboarding")} onForgot={() => setView("forgot")} />;
  }
  if (view === "forgot") return <ForgotPasswordScreen onClose={() => setView("login")} />;
  return <OnboardingScreen onLogin={() => setView("login")} />;
}

function Root() {
  const { loading, profile, updateProfile } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const showTour = profile ? profile.tourDone === false : false;
  const onTourStep = useCallback((tab: TabKey) => setActiveTab(tab), []);

  // Ao sair da conta, a próxima sessão começa sempre pela Home.
  const hasProfile = profile !== null;
  useEffect(() => {
    if (!hasProfile) {
      setActiveTab("home");
      setOverlay(null);
    }
  }, [hasProfile]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.teal500} />
      </View>
    );
  }

  // Fluxo 1 do diagrama: sem perfil, o usuário passa pelo onboarding (ou login).
  if (!profile) {
    return <AuthFlow />;
  }

  const closeOverlay = () => setOverlay(null);

  const renderOverlay = () => {
    switch (overlay) {
      case "checkin":
        return <CheckInScreen onClose={closeOverlay} onRelapse={() => setOverlay("relapse")} />;
      case "relapse":
        return <RelapseScreen onDone={closeOverlay} />;
      case "achievements":
        return <AchievementsScreen onClose={closeOverlay} />;
      case "ubs":
        return <UbsLocatorScreen onClose={closeOverlay} />;
      case "evolution":
        return <EvolutionScreen onClose={closeOverlay} />;
      case "terms":
        return <TermsScreen onClose={closeOverlay} />;
      case "fagerstrom":
        return <FagerstromTestScreen onClose={closeOverlay} />;
      case "treatment":
        return <TreatmentScreen onClose={closeOverlay} />;
      case "report":
        return <ReportScreen onClose={closeOverlay} onEditTreatment={() => setOverlay("treatment")} />;
      case "triggers":
        return <TriggersScreen onClose={closeOverlay} />;
      case "edit-profile":
        return <EditProfileScreen onClose={closeOverlay} />;
      case "reminder":
        return <ReminderSettingsScreen onClose={closeOverlay} />;
      case "article":
        return activeArticle ? (
          <ArticleScreen
            article={activeArticle}
            onClose={closeOverlay}
            onChat={() => {
              closeOverlay();
              setActiveTab("chat");
            }}
          />
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
            onOpenFagerstrom={() => setOverlay("fagerstrom")}
            onOpenArticle={(article) => {
              setActiveArticle(article);
              setOverlay("article");
            }}
          />
        );
      case "profile":
        return <ProfileScreen onNavigate={setOverlay} />;
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

      {showTour && !overlay && (
        <TourOverlay
          onStepChange={onTourStep}
          onFinish={() => {
            setActiveTab("home");
            updateProfile({ tourDone: true });
          }}
        />
      )}

      {!overlay && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onPanicPress={() => !showTour && setShowPanicModal(true)}
          tourTab={showTour ? activeTab : null}
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
        <View style={styles.page}>
          <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar style="dark" />
            <Root />
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  // No navegador, o app fica numa coluna com largura de celular (como no
  // protótipo do Figma); no Android/iOS ocupa a tela inteira.
  page: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#F3F4F6" : colors.slate50,
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: colors.slate50,
    overflow: "hidden",
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
