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
    URL_WEBSOCKET: "a3ek0tva1l.execute-api.ap-northeast-2.amazonaws.com/dev",
  },
}

module.exports = nextConfig
