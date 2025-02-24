import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/", // можно убрать, если нет кастомной страницы входа
  },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub; // Добавляем ID пользователя в сессию
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
console.log("NextAuth API is running");
export { handler as GET, handler as POST };
