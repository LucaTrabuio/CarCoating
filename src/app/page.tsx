import { getHomepageLayout } from '@/lib/homepage-layout';
import HomepageBlockRenderer from '@/components/blocks/homepage/HomepageBlockRenderer';

export default async function V3HomePage() {
  const blocks = await getHomepageLayout();
  return <HomepageBlockRenderer blocks={blocks} />;
}
