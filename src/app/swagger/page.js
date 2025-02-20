"use client";
import { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <p suppressHydrationWarning={true}>Loading Swagger...</p>;
  }

  return <div suppressHydrationWarning={true}>
    <SwaggerUI url="/api/docs" />
  </div>;
}
