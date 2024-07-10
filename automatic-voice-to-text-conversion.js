// ==UserScript==
// @name         Automatic voice to text conversion
// @description  语音自动转文字
// @run-at main, chat
// @version      0.1
// @author       Shapaper@126.com
// @license      gpl-3.0
// ==/UserScript==
(function () {
    const self = document.currentScript?.getAttribute("data-scriptio-script");
    let enabled = false;
    const ipcRenderer_on = window.LLAPI_PRE.ipcRenderer_LL_on;
    const ipcRenderer = LLAPI_PRE.ipcRenderer_LL;

    const set_id = window.LLAPI_PRE.set_id;

    /**来源：llapi*/
    let { webContentsId } = ipcRenderer.sendSync("___!boot");
    if (!webContentsId) {
        webContentsId = "2"
    }
    class Destructor {
        destructTextElement(element) {
            return {
                elementType: 1,
                elementId: "",
                textElement: {
                    content: element.content,
                    atType: element.atType || 0,
                    atUid: element.atUid || "",
                    atTinyId: "",
                    atNtUid: element.atNtUid,
                },
            };
        }

        destructXmlElement(element) {
            return {
                elementType: 8,
                elementId: "",
                grayTipElement: {
                    subElementType: 12,
                    extBufForUI: "0x",
                    xmlElement: {
                        busiType: "1",
                        busiId: "10145",
                        c2cType: 0,
                        serviceType: 0,
                        ctrlFlag: 7,
                        content: "<gtip align=\"center\"><qq uin=\"u_4B8ETD3ySVv--pNnQAupOA\" col=\"3\" jp=\"1042633805\" /><nor txt=\"邀请\"/><qq uin=\"u_iDVsVV8gskSMTB51hSDGVg\" col=\"3\" jp=\"1754196821\" /> <nor txt=\"加入了群聊。\"/> </gtip>",
                        templId: "10179",
                        seqId: "1313801018",
                        templParam: {},
                        pbReserv: "0x",
                        members: {}
                    },
                },
            };
        }

        destructImageElement(element, picElement) {
            return {
                elementType: 2,
                elementId: "",
                picElement: picElement,
            };
        }

        destructPttElement(element, pttElement) {
            return {
                elementType: 4,
                elementId: "",
                pttElement
            }
        }
        destructReplyElement(element) {
            return {
                elementType: 7,
                elementId: "",
                replyElement: {
                    replayMsgSeq: element.msgSeq, // raw.msgSeq
                    replayMsgId: element.msgId,  // raw.msgId
                    senderUin: element.senderUin,
                    senderUinStr: element.senderUinStr,
                }
            }
        }

        destructFaceElement(element) {
            return {
                elementType: 6,
                elementId: "",
                faceElement: {
                    faceIndex: element.faceIndex,
                    faceType: element.faceType == "normal" ? 1 : element.faceType == "normal-extended" ? 2 : element.faceType == "super" ? 3 : element.faceType,
                    ...((element.faceType == "super" || element.faceType == 3) && {
                        packId: "1",
                        stickerId: (element.faceSuperIndex || "0").toString(),
                        stickerType: 1,
                        sourceType: 1,
                        resultId: "",
                        superisedId: "",
                        randomType: 1,
                    }),
                },
            };
        }

        destructRawElement(element) {
            return element.raw;
        }

        destructPeer(peer) {
            return {
                chatType: peer.chatType == "friend" ? 1 : peer.chatType == "group" ? 2 : 1,
                peerUid: peer.uid,
                guildId: "",
            };
        }
        des() {
            return []
        }
    }

    const destructor = new Destructor();
    /**来源：llapi
     * @description 语音转文字(实验性)
     * @param {string} msgId 消息ID
     * @param {number} peer 对象的Peer
     * @param {MessageElement[]} elements
     */
    async function Ptt2Text(msgId, peer, elements) {
        const msgElement = JSON.parse(JSON.stringify(elements))
        await ntCall("ns-ntApi", "nodeIKernelMsgService/translatePtt2Text", [
            {
                msgId: msgId,
                peer: destructor.destructPeer(peer),
                msgElement: msgElement
            },
            null
        ]);
    }

    /**来源：llapi*/
    function ntCall(eventName, cmdName, args, isRegister = false) {
        return new Promise(async (resolve, reject) => {
            const uuid = crypto.randomUUID();
            ipcRenderer_on(`LL_DOWN_${uuid}`, (event, data) => {
                resolve(data);
            });
            set_id(uuid, webContentsId);
            ipcRenderer.send(
                `IPC_UP_${webContentsId}`,
                {
                    type: "request",
                    callbackId: uuid,
                    eventName: `${eventName}-${webContentsId}${isRegister ? "-register" : ""}`,
                },
                [cmdName, ...args]
            );
        })};



    async function process(component) {
        const el = component?.vnode?.el;
        if (!el || !(el instanceof Element)) {
            return;
        }
        if (!el.querySelector(".ptt-element__bottom-area")) {
            return;
        }
        const ptt_area = el.querySelector(".ptt-element__bottom-area");
        if (ptt_area) {
            const msgId = component?.props?.msgRecord?.msgId;
                if (msgId !== undefined ){
                if (true) { //!ptt_area.closest(".message-container--self")
                    const elements = component?.props?.msgRecord?.elements[0];
                    await Ptt2Text(msgId,await window.LLAPI_PRE.get_peer(), elements)
                    ptt_area.style.display = "block"
                }
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



