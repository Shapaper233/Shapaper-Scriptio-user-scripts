// ==UserScript==
// @name         Group Name Completion
// @description  给群名称补全各种信息：备注 + 昵称 + QQ 号，需要 hook-vue.js 的支持
// @run-at       main, chat
// @reactive     true
// @version      0.1.1
// @author       Shapaper@126.com
// @license      gpl-3.0
// ==/UserScript==
(function () {
    let enabled = false;
    const log = console.log.bind(console, "[Group Name Completion]");
    function process(component) {
        const el = component?.vnode?.el;
        if (!el || !(el instanceof Element)) {
            return;
        }
        if (!el.querySelector(".user-name .text-ellipsis")) {
            return;
        }
        const user_name = el.querySelector(".user-name .text-ellipsis");
        const senderUin = component?.props?.msgRecord?.senderUin
        if (senderUin !== undefined && !user_name.classList.contains("has-extra-info")) {
            let nick = component?.props?.msgRecord?.sendNickName;
            let remark = component?.props?.msgRecord?.sendRemarkName;
            if (remark) { remark = remark + "|"; }
            if (nick) { nick = nick + "|"; }
            user_name.textContent = user_name.textContent + " (" + remark + nick + senderUin + ")";
            user_name.classList.add("has-extra-info");
        }
    }
    function enable() {
        if (enabled) return;
        window.__VUE_MOUNT__.push(process);
        log("群名称补全已开启");
        enabled = true;
    }
    function disable() {
        if (!enabled) return;
        const index = window.__VUE_MOUNT__.indexOf(process);
        if (index > -1) {
            window.__VUE_MOUNT__.splice(index, 1);
            log("群名称补全已关闭");
        }
        enabled = false;
    }
    if (window.__VUE_MOUNT__) {
        enable();
    } else {
        window.addEventListener("vue-hooked", enable, { once: true });
    }
    scriptio_toolkit.listen((v) => {
        v ? enable() : disable();
    }, false);
})();
