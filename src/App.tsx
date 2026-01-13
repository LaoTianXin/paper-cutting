import React, { useEffect, useState } from "react";
import PaperCuttingApp from "./PaperCuttingApp";
import SharePage from "./components/SharePage/SharePage";
import "./index.css";

export default function App(): React.JSX.Element {
  const [isSharePage, setIsSharePage] = useState(false);

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

  return <PaperCuttingApp />;
}
