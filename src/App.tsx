import React, { useEffect, useState } from "react";
import PaperCuttingApp from "./PaperCuttingApp";
import SharePage from "./components/SharePage/SharePage";
import "./index.css";

export default function App(): React.JSX.Element {
  const [isSharePage, setIsSharePage] = useState(false);

  useEffect(() => {
    // Check if current path is /share
    const checkPath = () => {
      const path = window.location.pathname;
      setIsSharePage(path === '/share' || path.startsWith('/share?'));
    };

    checkPath();

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  // Render SharePage if on /share path
  if (isSharePage) {
    return <SharePage />;
  }

  return <PaperCuttingApp />;
}
