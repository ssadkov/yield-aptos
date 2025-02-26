"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function SwaggerPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <p suppressHydrationWarning={true}>Loading Swagger...</p>;
  }

  return (
    <div className="h-screen w-full bg-white">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
