import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window
    window.scrollTo({ top: 0, left: 0 });

    // Scroll all internal scrollable containers (dashboard, wizard, etc.)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
      // Target common scrollable containers
      document.querySelectorAll("[class*='overflow-y-auto'], [class*='overflow-auto'], main").forEach((el) => {
        el.scrollTop = 0;
      });
    });
  }, [pathname]);

  return null;
};
