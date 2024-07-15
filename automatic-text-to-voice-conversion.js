// ==UserScript==
// @name         Automatic text to voice conversion
// @description  文本自动转说话！让我看看谁在语音没有麦克风😚（方便一些没有麦克风的人直接在群里发消息您直接就可以听到）
// @reactive     true
// @version      0.2.0
// @author       Shapaper@126.com
// @license      gpl-3.0
// ==/UserScript==

(function () {
    const self = document.currentScript?.getAttribute("data-scriptio-script");
    let enabled = false;
    let synth = window.speechSynthesis;
    //synth.volume = 0.1;//设置音量0~1
    let the_statement_being_read_el= null //保底防止界面css未清除
    let last_info_time=-1 //根据消息id来判断先后
    let last_peerUid=-1
    let last_chatType=-1
    let messageStyles = {};
    let new_chatview=null
    // 延迟函数
    const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

    async function process(component) {
        const el = component?.vnode?.el;
        if (!el || !(el instanceof Element)) {
            return;
        }
        //判断界面是否刷新，补绘按钮css-根据测试，界面反复刷新，第三次的元素才能获取到值，所以需要在ttsok前执行，不然只会判断第一次的元素
        const msgId = component?.props?.msgRecord?.msgId; // 获取消息ID
        if (msgId !== undefined) {
            const msgRecord = component?.props?.msgRecord; // 获取消息记录
            const { chatType, peerUid } = msgRecord; // 获取聊天类型和对方UID
            //console.log(chatType,peerUid)
            if (last_chatType!==chatType || last_peerUid!==peerUid){
                last_chatType=chatType
                last_peerUid=peerUid

                // 停止当前的语音合成
                synth.cancel();

                // 清除队列中的所有任务
                synth.pending = [];

                // 如果需要，您还可以中断正在播放的音频
                if (synth.speaking) {
                    synth.pause();
                    synth.resume(); // 清除暂停状态，确保不再播放
                }
                messageStyles = {};
                //console.log("界面切换：",last_chatType,last_peerUid,msgRecord)

                var element = document.getElementById('id-func-bar-microphone_on');
                if (element) {
                    element.style.backgroundColor = ison ? '#00ff1f' : 'unset';
                } else {
                    console.error('未找到指定ID的元素：func-bar-microphone_on');
                }
                new_chatview=true
            }
        }else{
        return;}
        //只读别人发的
        if (!el.querySelector(".text-element--other")) {
            return;
        }

        // 已经读过的跳过
        if (el.querySelector(".ttsok")) {
            return; // Skip processing if already processed
        }
        //添加读过标签
        el.classList.add("ttsok");

        await sleep(100) //太快消息刷新不出来，测试了我半天！😭

        //console.log(component?.props?.msgRecord?.msgId)
        //判断消息时间，推断是否为老的消息，比之前消息还老的就退出
        if (component?.props?.msgRecord?.msgId>last_info_time){
            last_info_time=component?.props?.msgRecord?.msgId
        }else{
            //console.log(el.querySelector(".text-element--other").textContent,"老消息")
            return;
        }
        //假如界面刚刷新就不读了，不然会读界面中最后一个。。。。但是启用会导致第一个消息读不到……算了不开了
        //if (new_chatview){
        //    new_chatview=!new_chatview
        //    return;
        //}

        //兼容lite-tools，撤回不读（其实没用，做测试不删了，万一触发了呢）
        if (hasSiblingWithClass(el.querySelector(".text-element--other"),"recall-tag")){
            return;
        }
        //console.log(el.querySelector(".text-element--other").textContent)
        //console.log(el.querySelector(".text-element--other")?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.id)
        //console.log(hasSiblingWithClass(el.querySelector(".text-element--other"),"recall-tag"))
        //开启转文字
        if (ison){
            //获取文本
            //console.log(el.querySelector(".text-element--other")?.parentElement?.parentElement?.parentElement?.querySelector(".avatar-span").getAttribute('aria-label'))//.getAttribute('aria-label')
            //user_names=el.querySelector(".text-element--other")?.parentElement?.parentElement?.parentElement?.querySelector(".avatar-span").ariaLabel
            const msgRecord = component?.props?.msgRecord;
            //console.log(msgRecord)
            sendMemberName=msgRecord.sendMemberName
            if (sendMemberName==""){
            console.log("昵称获取异常，正在启用备用逻辑1:备注名")
            sendMemberName=msgRecord.sendRemarkName
            }
            if (sendMemberName==""){
            console.log("昵称获取异常，正在启用备用逻辑2:昵称")
            sendMemberName=msgRecord.sendNickName
            }
            let elements_textall = el.querySelectorAll(".text-element--other");
            let textall = "";

            for (let i = 0; i < elements_textall.length; i++) {
                if (i !== 0) {
                    textall += " ";
                }
                textall += elements_textall[i].textContent;
            }

            //let utterThis = new SpeechSynthesisUtterance(sendMemberName + "说：" + textall);
            // 读消息的时候给与对应金边
            //console.log(el.querySelector(".message-container").querySelector(".message-content__wrapper").querySelector(".msg-content-container"))
            let needel = el.querySelector(".message-container").querySelector(".message-content__wrapper").querySelector(".msg-content-container");


            // 保存原始的boxShadow样式
            const originalBoxShadow = needel.style.boxShadow;
            // 存储消息ID、元素和原始样式
            messageStyles[msgId] = {
                element: needel,
                boxShadow: originalBoxShadow
            };

            let utterThis = new SpeechSynthesisUtterance(sendMemberName + "说：" + textall);

            utterThis.onstart = function(event) {
                // 根据消息ID获取元素并设置样式
                if (messageStyles[msgId]) {
                    messageStyles[msgId].element.style.boxShadow = 'rgba(255, 255, 0, 0.55) 0px 0px 9px 4px';
                    the_statement_being_read_el=needel
                }
            };

            utterThis.onend = function(event) {
                // 根据消息ID获取元素并恢复原始样式
                if (messageStyles[msgId]) {
                    messageStyles[msgId].element.style.boxShadow = messageStyles[msgId].boxShadow;
                    // 如果不需要保留样式，可以在读完之后删除
                    delete messageStyles[msgId];
                }
            };

            synth.speak(utterThis);
        }
    }
    // 更新音量并播报
    function updateVolumeAndAnnounce(volumeChange) {
        currentVolume += volumeChange;
        currentVolume = Math.max(0, Math.min(currentVolume, 1)); // 限制音量在0和1之间
        synth.volume = currentVolume; // 更新语音合成音量

        // 暂停当前的语音合成
        if (synth.speaking) {
            synth.pause();
        }

        // 播报当前音量
        let utterThis = new SpeechSynthesisUtterance(`当前音量为${Math.round(currentVolume * 100)}%`);
        synth.speak(utterThis);

        // 当播报音量结束后，继续之前的语音合成
        utterThis.onend = function(event) {
            if (synth.paused) {
                synth.resume();
            }
        };
    }
    function hasSiblingWithClass(element, className) {
        // 获取父元素
        let parent = element.parentElement;
        if (!parent) {
            return false; // 如果没有父元素，直接返回 false
        }

        // 遍历父元素的所有子元素
        let siblings = parent.children;
        for (let i = 0; i < siblings.length; i++) {
            let sibling = siblings[i];
            // 排除自身元素
            if (sibling !== element) {
                // 检查是否包含特定类名
                if (sibling.classList.contains(className)) {
                    return true; // 如果找到含有特定类名的同层元素，返回 true
                }
            }
        }

        return false; // 如果同层没有含有特定类名的元素，返回 false
    }


    function enable() {
        if (enabled) return;
        if (!window.__VUE_MOUNT__) {
            window.__VUE_MOUNT__ = [];
        }

        enabled = true;
        console.log("文字自动转语音插件已开启");

        window.__VUE_MOUNT__.push(process);

        // Call keyDownWrapper to start listening for F10 key press
        keyDownWrapper(handleKeyDown);
    }

    function disable() {
        enabled = false;
        console.log("文字自动转语音插件已关闭");

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

    // Function to toggle microphone on F10 key press
    let ison = false;
    function handleKeyDown(e) {
        if (e.key === "F10" && e.shiftKey) {
            var element = document.getElementById('id-func-bar-microphone_on');
            if (ison){ //关闭合成时清空列表

                // 停止当前的语音合成
                synth.cancel();

                // 清除队列中的所有任务
                synth.pending = [];

                // 如果需要，您还可以中断正在播放的音频
                if (synth.speaking) {
                    synth.pause();
                    synth.resume(); // 清除暂停状态，确保不再播放
                }
                messageStyles = {};
            }
            if (element) {
                ison = !ison;
                element.style.backgroundColor = ison ? '#00ff1f' : 'unset';
            } else {
                console.error('未找到指定ID的元素：func-bar-microphone_on');
            }


            let utterThis = new SpeechSynthesisUtterance(ison ? "文字自动转语音已开启" : "文字自动转语音已关闭");
            synth.speak(utterThis);
            the_statement_being_read_el.style.boxShadow = 'none';//保底防止没有清空css（

        }
    }

    function keyDownWrapper(callback) {
        document.addEventListener('keydown', callback);
    }
})();