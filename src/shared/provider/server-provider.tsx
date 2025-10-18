import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

export function ServerProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>{children}</ConvexAuthNextjsServerProvider>
  );
}
