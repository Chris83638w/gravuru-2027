import { withPayload } from '@payloadcms/next/withPayload'
export default withPayload({ distDir: process.env.NEXT_BUILD_DIR || '.next', poweredByHeader: false, reactStrictMode: true, experimental: { serverActions: { bodySizeLimit: '1mb' } } })
