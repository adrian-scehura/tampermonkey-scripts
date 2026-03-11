// ==UserScript==
// @name         GitHub PR Copy Title Link
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  Adds a button to copy the PR title as a rich text link
// @match        https://github.com/*/*/pull/*
// @updateURL    https://raw.githubusercontent.com/adrian-scehura/tampermonkey-scripts/main/github-pr-links.js
// @downloadURL  https://raw.githubusercontent.com/adrian-scehura/tampermonkey-scripts/main/github-pr-links.js
// @grant        GM_setClipboard
// ==/UserScript==

(() => {
  "use strict";

  const BTN_RICH_ID = "tm-copy-pr-link-rich-btn";
  const BTN_WRAP_ID = "tm-copy-pr-link-btn-wrap";

  const getPrUrl = () => {
    const match = location.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/);
    return location.origin + (match ? match[0] : location.pathname);
  };

  const getTitle = () => {
    const h1 = document.querySelector('[data-component="PH_Title"]');
    const titleText = h1?.querySelector(".markdown-title")?.textContent;

    if (titleText) {
      return titleText.trim().replace(/\s+/g, " ");
    }

    const titleNode = h1?.cloneNode(true);
    titleNode
      ?.querySelectorAll('button, [popover], [aria-hidden="true"], .fgColor-muted')
      .forEach((node) => node.remove());

    return (titleNode?.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\s*(?:\(#\d+\)|#\d+)\s*$/, "");
  };

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const setCopiedState = (button, originalText) => {
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  };

  const copyRich = async (plainText, htmlText) => {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([htmlText], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return;
    }

    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(htmlText, "html");
      return;
    }

    await navigator.clipboard.writeText(plainText);
  };

  const styleTitleParent = (parent) => {
    parent.style.display = "flex";
    parent.style.flexDirection = "row-reverse";
    parent.style.alignItems = "center";
    parent.style.gap = "8px";
  };

  function addButtons() {
    const h1 = document.querySelector('[data-component="PH_Title"]');
    const parent = h1?.parentElement;
    if (!h1 || !parent) return;

    document.getElementById(BTN_WRAP_ID)?.remove();
    styleTitleParent(parent);

    const wrap = document.createElement("span");
    wrap.id = BTN_WRAP_ID;
    wrap.style.display = "inline-flex";
    wrap.style.gap = "6px";
    wrap.style.flexShrink = "0";

    const richBtn = document.createElement("button");
    richBtn.id = BTN_RICH_ID;
    richBtn.type = "button";
    richBtn.className = "btn btn-sm";
    richBtn.textContent = "Copy link";

    richBtn.onclick = async () => {
      const url = getPrUrl();
      const title = getTitle();
      const plain = `${url} -> ${title}`;
      const html = `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a> -&gt; ${escapeHtml(title)}`;
      await copyRich(plain, html);
      setCopiedState(richBtn, "Copy link");
    };

    wrap.append(richBtn);
    parent.prepend(wrap);
  }

  addButtons();
  window.addEventListener("turbo:load", addButtons);
  window.addEventListener("turbo:render", addButtons);
})();
