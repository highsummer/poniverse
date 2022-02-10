import React from "react";
import Head from "next/head";

const DefaultHeader: React.FunctionComponent = props => {
  return <React.Fragment>
    <Head>
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#92bf5f" />
      <meta name="msapplication-TileColor" content="#2d89ef" />
      <meta name="theme-color" content="#ffffff" />
      
      <title>포니버스</title>
      <meta name="description" content="새내기새로배움터를 테마로 꾸며진 세상에서 포스텍 친구들은 만나보세요!" />

      <meta property="og:url" content="https://poniverse.yoonha.dev/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="포니버스" />
      <meta property="og:description" content="새내기새로배움터를 테마로 꾸며진 세상에서 포스텍 친구들은 만나보세요!" />
      <meta property="og:image" content="/assets/thumbnail.png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="poniverse.yoonha.dev" />
      <meta property="twitter:url" content="https://poniverse.yoonha.dev/" />
      <meta name="twitter:title" content="포니버스" />
      <meta name="twitter:description" content="새내기새로배움터를 테마로 꾸며진 세상에서 포스텍 친구들은 만나보세요!" />
      <meta name="twitter:image" content="/assets/thumbnail.png" />
    </Head>
    {props.children}
  </React.Fragment>
}

export default DefaultHeader