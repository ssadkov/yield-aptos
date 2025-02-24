"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Sidebar() {
  const { data: session } = useSession();

  return (
    <aside className="w-64 h-screen p-4 fixed left-0 top-0 flex flex-col gap-4">
      <Card className="shadow-md">
        <CardContent className="p-4 flex flex-col items-center">
          <h2 className="text-lg font-bold">Yield-AI Wallet</h2>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-4 flex flex-col items-center">
          {session ? (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Signed in as {session.user?.email}
              </p>
              <Button onClick={() => signOut()} className="w-full mt-2">
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn("google")} className="w-full">
              Sign in with Google
            </Button>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
