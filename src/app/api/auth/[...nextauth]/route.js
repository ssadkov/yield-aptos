import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Import from the separate file

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
