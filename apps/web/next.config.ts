import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mapkeeper/db', '@mapkeeper/osm', '@mapkeeper/tagging', '@mapkeeper/matching'],
};

export default nextConfig;
