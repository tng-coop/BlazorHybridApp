#!/usr/bin/env node

import CDP from 'chrome-remote-interface';

async function fetchHTML(url) {
  let client;
  try {
    client = await CDP({ port: 9222 });

    const { Page, Runtime } = client;
    await Page.enable();

    await Page.navigate({ url });
    await Page.loadEventFired();

    const { result: { value: html } } = await Runtime.evaluate({
      expression: 'document.documentElement.outerHTML'
    });

    console.log(html);
  } catch (error) {
    console.error("Error fetching HTML:", error);
  } finally {
    if (client) await client.close();
  }
}

const [,, url] = process.argv;

if (!url) {
  console.error("Usage: fetch.mjs <URL>");
  process.exit(1);
}

fetchHTML(url);
