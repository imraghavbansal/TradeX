import Header from "@/components/Header";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const layout = async ({ children }: { children: React.ReactNode }) => {
  // redirect() throws internally, so both calls below live outside the try/catch
  // — otherwise the "no session" redirect gets caught by our own catch, logged
  // as a fake "Auth session error" on every normal unauthenticated visit, then
  // thrown again from the catch block.
  let session;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    })
  } catch (error) {
    console.error('Auth session error:', error);
    redirect('/sign-in');
  }

  if (!session?.user) redirect('/sign-in');

  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
  return (
    <main className="min-h-screen text-gray-400">
    <Header user={user}/>
    <div className="container py-10">
        {children}
        </div>
        </main>
  )
}

export default layout