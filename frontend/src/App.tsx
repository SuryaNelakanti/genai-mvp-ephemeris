import { AppStateProvider, useAppState } from "./context/AppStateContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Onboarding } from "./components/Onboarding";
import { Home } from "./components/Home";
import { AtGlance } from "./components/AtGlance";
import { InDepth } from "./components/InDepth";
import { Profile } from "./components/Profile";
import { TheVoid } from "./components/TheVoid";
import { StarryBackground } from "./components/StarryBackground";
import { PageTransition } from "./components/PageTransition";
import { AnimatePresence } from "motion/react";

function AppContent() {
  const { currentScreen } = useAppState();

  return (
    <>
      <StarryBackground />
      <AnimatePresence mode="wait">
        <PageTransition key={currentScreen} className="w-full">
          {(() => {
            switch (currentScreen) {
              case "onboarding":
                return <Onboarding />;
              case "home":
                return <Home />;
              case "at-glance":
                return <AtGlance />;
              case "in-depth":
                return <InDepth />;
              case "profile":
                return <Profile />;
              case "void":
                return <TheVoid />;
              default:
                return <Onboarding />;
            }
          })()}
        </PageTransition>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppStateProvider>
  );
}
