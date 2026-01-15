import React, { useEffect, useState, useCallback } from "react";
import PaperCuttingApp from "./PaperCuttingApp";
import SharePage from "./components/SharePage/SharePage";
import SettingsModal from "./components/SettingsModal";
import "./index.css";

export default function App(): React.JSX.Element {
  const [isSharePage, setIsSharePage] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // F8 keyboard shortcut to toggle settings
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F8') {
      e.preventDefault();
      setIsSettingsOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    // Check if URL contains ?id= parameter to show share page
    const checkForSharePage = () => {
      const searchParams = new URLSearchParams(window.location.search);
      // If URL has 'id' parameter, show the share page
      const hasId = searchParams.has('id');
      setIsSharePage(hasId);
    };

    checkForSharePage();

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', checkForSharePage);
    return () => window.removeEventListener('popstate', checkForSharePage);
  }, []);

  // Render SharePage if URL has ?id= parameter
  if (isSharePage) {
    return <SharePage />;
  }

  return (
    <>
      <PaperCuttingApp />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

