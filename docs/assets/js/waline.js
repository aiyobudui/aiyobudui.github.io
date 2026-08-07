// waline.js — 留言板 Waline 动态加载与初始化（原 index.html 内联块，外置保持 index.html 整洁）
// 仅在留言板(/zh-cn/bbs)页面初始化，其余页面直接 return。

function loadWalineResources() {
    return new Promise(function (resolve, reject) {
        var cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/@waline/client@3/dist/waline.css';
        cssLink.onerror = function () {
            this.href = 'https://unpkg.com/@waline/client@v3/dist/waline.css';
        };
        document.head.appendChild(cssLink);

        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@waline/client@3/dist/waline.umd.js';
        script.onload = function () {
            resolve();
        };
        script.onerror = function () {
            this.src = 'https://unpkg.com/@waline/client@v3/dist/waline.umd.js';
            this.onload = function () {
                resolve();
            };
            this.onerror = function () {
                reject();
            };
        };
        document.body.appendChild(script);
    });
}

function initWaline() {
    var currentPath = window.location.pathname + window.location.hash;
    var isBbsPage = currentPath.includes('/zh-cn/bbs') || currentPath.includes('/bbs') || currentPath === '/bbs.html' || currentPath.includes('#/bbs');

    if (!isBbsPage) {
        return;
    }

    if (typeof Waline === 'undefined') {
        loadWalineResources().then(function () {
            initWaline();
        }).catch(function () {
            console.error('Waline 资源加载失败');
        });
        return;
    }

    var container = document.querySelector('#waline');

    if (!container) {
        console.error('未找到 #waline 容器');
        return;
    }

    if (container.hasAttribute('data-waline-initialized')) {
        return;
    }

    try {
        var commentPath = currentPath.includes('#') ? currentPath.split('#')[1] || '/zh-cn/bbs' : currentPath;
        if (!commentPath.startsWith('/')) commentPath = '/' + commentPath;

        Waline.init({
            el: '#waline',
            serverURL: 'https://waline.haozy.top',
            lang: 'zh-CN',
            path: commentPath,
            meta: ['nick', 'mail'],
            requiredMeta: ['nick'],
            pageSize: 6,
            commentSorting: 'latest',
            imageUploader: false,
            noCopyright: false,
            search: false,
            login: 'disable',
            reaction: false,
            recordIP: false,
            pageview: false,
            emoji: [
                'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/qq',
                'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/bilibili',
            ],

            locale: {
                nickRequired: "请输入昵称",
                nick: '昵称',
                nickError: '昵称不能小于2字符',
                mail: '邮箱',
                mailError: '邮件地址不正确',
                word: '字',
                wordHint: '评论字数应在 $0 到 $1 字之间！\n当前字数：$2',
                anonymous: '匿名',
                placeholder: '留言请说明资源类型、重名资源太多，也方便站长寻找。',
                spam: '评论内容包含广告或垃圾信息，已被删除',
                submit: '提交',
                reply: '回复',
                cancelReply: '取消回复',
                level0: '潜水',
                level1: '冒泡',
                level2: '吐槽',
                level3: '活跃',
                level4: '话痨',
                level5: '传说',
                refresh: '刷新',
                more: '更多...',
                preview: '预览',
                emoji: '表情',
                seconds: '秒前',
                minutes: '分钟前',
                hours: '小时前',
                days: '天前',
                now: '刚刚',
                sticky: '置顶',
                required: '必填项',
                empty: '留言不能为空',
                comment: '条留言',
            },
            highlighter: false,
            texRenderer: false,
        });
        container.setAttribute('data-waline-initialized', 'true');
    } catch (error) {
        console.error('Waline 初始化失败:', error);
    }
}
