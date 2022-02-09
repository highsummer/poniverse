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
    </Head>
    {props.children}
  </React.Fragment>
}

export default DefaultHeader