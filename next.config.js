/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    config.module.rules.push(
      {
        test: /\.(vert|frag)$/,
        type: "asset/source",
      },
      {
        test: /\.obj$/,
        type: "asset/source",
      },
      {
        test: /\.txt$/,
        type: "asset/source",
      },
      {
        test: /\.svg$/,
        type: "asset/inline",
      }
    )

    return config
  },

  trailingSlash: true,

  publicRuntimeConfig: {
    URL_REST: "rest-poniverse.yoonha.dev",
    URL_WEBSOCKET: "websocket-poniverse.yoonha.dev",
  },
}

module.exports = nextConfig
