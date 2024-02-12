// 链接预览：鼠标经过链接时尝试加载浏览，悬浮显示链接的标题和描述，需要 hook-vue.js 的支持
// @run-at main, chat, record, forward

(function () {
    const self = document.currentScript?.getAttribute("data-scriptio-script");
    let enabled = false;
    function getTitle(doc) { // Get the title of a website
        const title = doc.querySelector("title");
        return title?.textContent || "";
    }
    function getDesc(doc) { // Get the description of a website
        const desc = doc.querySelector("meta[name~='description']");
        return desc?.content || "";
    }
    async function getLinkInfo(url) { // Get the title and description of a link
        try {
            const res = await fetch(url);
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            const l = [];
            const title = getTitle(doc);
            const desc = getDesc(doc);
            if (title) l.push(title);
            if (desc) l.push(desc);
            return l.join("\n") || "暂无链接浏览";
        } catch (e) {
            return "链接预览加载失败：" + e;
        }
    }
    function processLink(link) {
        const url = link?.__VUE__?.[0]?.props?.content;
        if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) return;
        link.addEventListener("mouseover", async () => {
            link.title = "正在加载链接预览，鼠标不再显示进度后再次悬浮即可查看";
            link.style.cursor = "progress";
            link.title = await getLinkInfo(url);
            link.style.cursor = "";
        }, { once: true });
    }
    function linkPreview(component) {
        const el = component?.vnode?.el;
        if (!el?.classList?.contains("text-element")) {
            return;
        }
        const links = el.querySelectorAll(".text-link");
        links.forEach(processLink);
    }
    function enable() {
        if (enabled) return;
        window.__VUE_MOUNT__.push(linkPreview);
        enabled = true;
    }
    function disable() {
        if (!enabled) return;
        const index = window.__VUE_MOUNT__.indexOf(linkPreview);
        if (index > -1) {
            window.__VUE_MOUNT__.splice(index, 1);
        }
        enabled = false;
    }
    if (window.__VUE_MOUNT__) {
        enable();
    } else {
        window.addEventListener("vue-hooked", enable, { once: true });
    }
    window.addEventListener("scriptio-toggle", (event) => {
        const path = event.detail.path;
        if (path === self) {
            if (event.detail.enabled) {
                enable();
            } else {
                disable();
            }
        }
    });
})();