import { redirect } from 'next/navigation';

// Individual store slugs redirect to the shared sub-company site
export default async function StoreSlugRedirect({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  redirect(`/${companySlug}`);
}
