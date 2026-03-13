import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-screen">
      <div className="page-stack justify-center">
        <div className="command-panel space-y-6 p-6 text-center">
          <PageHeader eyebrow="Lost Route" title="404" subtitle="That puzzle board does not exist." compact />
          <img
            src="/brand/puzzle-rivals-logo.png"
            alt="Puzzle Rivals"
            className="mx-auto h-40 w-40 rounded-[32px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            draggable={false}
          />
          <div className="flex justify-center">
            <Button asChild variant="play" size="xl">
              <a href="/">Return Home</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
