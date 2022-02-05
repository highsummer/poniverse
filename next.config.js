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
        test: /\.svg$/,
        type: "asset/inline",
      }
    )

    return config
  },

  publicRuntimeConfig: {
    URL_REST: "374ffq4rze.execute-api.ap-northeast-2.amazonaws.com/dev",
    URL_WEBSOCKET: "a3ek0tva1l.execute-api.ap-northeast-2.amazonaws.com/dev",
  }
}

module.exports = nextConfig
