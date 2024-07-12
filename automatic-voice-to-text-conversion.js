// ==UserScript==
// @name         Automatic voice to text conversion
// @description  语音自动转文字
// @run-at       main, chat
// @version      0.1
// @author       Shapaper@126.com,PRO
// @license      gpl-3.0
// ==/UserScript==

(function () {
    // 获取当前脚本的路径
    const self = document.currentScript?.getAttribute("data-scriptio-script");
    let enabled = false; // 标识是否已启用脚本
    const ipcRenderer = window.scriptio.ipcRenderer; // 获取Electron IPC Renderer对象

    /** 来源：llapi **/
    let { webContentsId } = ipcRenderer.sendSync("___!boot");
    if (!webContentsId) {
        webContentsId = "2"; // 设置默认的webContentsId
    }

    // 定义一个对象析构器类
    class Destructor {
        // 析构Peer对象
        destructPeer(peer) {
            return {
                // 根据聊天类型返回不同的值：1表示好友，2表示群组，默认为1
                chatType: peer.chatType == "friend" ? 1 : peer.chatType == "group" ? 2 : 1,
                peerUid: peer.uid, // 对方的UID
                guildId: "", // 公会ID，暂时为空字符串
            };
        }
    }

    const destructor = new Destructor(); // 创建析构器实例

    /**
     * 来源：llapi
     * @description 语音转文字(实验性)
     * @param {string} msgId 消息ID
     * @param {object} peer 对象的Peer，包含uid和chatType
     * @param {MessageElement[]} elements 消息元素数组
     */
    async function Ptt2Text(msgId, peer, elements) {
        const msgElement = JSON.parse(JSON.stringify(elements)); // 深拷贝消息元素
        // 调用ntCall方法，发送语音转文字的请求
        await ntCall("ns-ntApi", "nodeIKernelMsgService/translatePtt2Text", [
            {
                msgId: msgId,
                peer: destructor.destructPeer(peer), // 析构Peer对象
                msgElement: msgElement // 消息元素
            },
            null
        ]);
    }

    /** 来源：llapi */
    // 发送NT调用的通用函数
    function ntCall(eventName, cmdName, args, isRegister = false) {
        return new Promise(async (resolve, reject) => {
            const uuid = crypto.randomUUID(); // 生成随机UUID
            // 发送IPC请求
            ipcRenderer.send(
                `IPC_UP_${webContentsId}`,
                {
                    type: "request",
                    callbackId: uuid,
                    eventName: `${eventName}-${webContentsId}${isRegister ? "-register" : ""}`,
                },
                [cmdName, ...args]
            );
            resolve("data"); // 返回数据
        });
    }

    // 延迟函数
    const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

    // 处理函数，用于处理组件
    async function process(component) {
        const el = component?.vnode?.el; // 获取虚拟DOM元素
        if (!el || !(el instanceof Element)) {
            return; // 如果元素不存在或不是Element类型，直接返回
        }
        if (!el.querySelector(".ptt-element__bottom-area")) {
            return; // 如果没有找到指定的类名元素，直接返回
        }
        const ptt_area = el.querySelector(".ptt-element__bottom-area"); // 获取语音消息区域元素
        if (ptt_area) {
            const msgId = component?.props?.msgRecord?.msgId; // 获取消息ID
            if (msgId !== undefined) {
                // 如果当前界面打开了语音输入框，并且是自己的消息，延迟处理
                if (document.querySelector('.audio-msg-input') && ptt_area.closest(".message-container--self")) {
                    await sleep(500); // 延迟500毫秒
                }
                const msgRecord = component?.props?.msgRecord; // 获取消息记录
                if (msgRecord) {
                    const elements = msgRecord.elements[0]; // 获取消息元素
                    const { chatType, peerUid } = msgRecord; // 获取聊天类型和对方UID

                    let chatTypeValue = '';
                    if (chatType === 1) {
                        chatTypeValue = 'friend'; // 好友聊天
                    } else if (chatType === 2) {
                        chatTypeValue = 'group'; // 群组聊天
                    }
                    // 执行语音转文字的方法
                    await Ptt2Text(msgId, { uid: peerUid, guildId: '', chatType: chatTypeValue }, elements);
                }
                ptt_area.style.display = "block"; // 显示语音消息区域
            }
        }
    }

    function enable() {
        if (enabled) return;
        if (!window.__VUE_MOUNT__) {
            window.__VUE_MOUNT__ = [];
        }

        enabled = true;
        console.log("语音自动转文字已开启");
        window.__VUE_MOUNT__.push(process);
    }

    function disable() {
        enabled = false;
        console.log("语音自动转文字已关闭");
        if (!enabled) return;
        const index = window.__VUE_MOUNT__.indexOf(process);
        if (index > -1) {
            window.__VUE_MOUNT__.splice(index, 1);
        }
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
