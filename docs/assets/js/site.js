// site.js — 站点自定义脚本（合并自 index.html 内联块，由 index.html 末尾 <script src> 引入）
// 引入时 Docsify 已加载、DOMContentLoaded 尚未触发，故 hooks 注册与事件监听均正常。

// 1. 手机菜单

function isMobileDevice() {
    return window.innerWidth <= 767 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function toggleMobileNav() {
    requestAnimationFrame(function () {
        var mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            if (isMobileDevice()) {
                mobileNav.classList.add('force-show');
                document.body.style.paddingBottom = mobileNav.offsetHeight + 'px';
            } else {
                mobileNav.classList.remove('force-show');
                document.body.style.paddingBottom = '';
            }
        }
    });
}

window.addEventListener('load', toggleMobileNav);
window.addEventListener('resize', function () {
    setTimeout(toggleMobileNav, 100);
});
window.addEventListener('pageshow', toggleMobileNav);

// 2. 正文内「本页目录」：由 hook.doneEach 调用，抓取 h2 生成目录卡片
function buildInContentToc() {
    if (isMobileDevice()) return; // 手机端不显示：侧边栏主导航已足够，避免挤占正文

    var old = document.querySelector('.in-content-toc');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var section = document.querySelector('.content .markdown-section') || document.querySelector('.markdown-section');
    if (!section) return;

    var headings = section.querySelectorAll('h2'); // 只抓取 h2（需求：标题2）
    if (headings.length < 2) return; // 少于 2 个 h2 不显示目录

    var base = (location.hash || '#/').split('?')[0];

    var toc = document.createElement('nav');
    toc.className = 'in-content-toc';
    toc.setAttribute('aria-label', '本页目录');

    var title = document.createElement('div');
    title.className = 'in-content-toc__title';
    title.textContent = '本页目录';
    toc.appendChild(title);

    var ul = document.createElement('ul');
    headings.forEach(function (h) {
        if (!h.id) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = base + '?id=' + h.id;
        a.textContent = h.textContent;
        a.setAttribute('data-id', h.id);
        a.addEventListener('click', function (e) {
            // 左键平滑滚动到标题；保留中键/新标签打开行为
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            var target = document.getElementById(h.id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (history.replaceState) history.replaceState(null, '', base + '?id=' + h.id);
            }
        });
        li.appendChild(a);
        ul.appendChild(li);
    });
    toc.appendChild(ul);

    var h1 = section.querySelector('h1');
    if (h1 && h1.parentNode === section) {
        h1.insertAdjacentElement('afterend', toc);
    } else {
        section.insertAdjacentElement('afterbegin', toc);
    }
}

// 2.5 中等宽度下悬浮 TOC 的展开/收起（768px–1599px 点击按钮展开，点标题或外部收起）
document.addEventListener('click', function (e) {
    var toc = document.querySelector('.in-content-toc');
    if (!toc) return;

    // 非悬浮区间：确保不残留 is-open
    if (window.innerWidth < 768 || window.innerWidth >= 1600) {
        toc.classList.remove('is-open');
        return;
    }

    if (toc.contains(e.target)) {
        var title = toc.querySelector('.in-content-toc__title');
        var clickedTitle = title && (e.target === title || title.contains(e.target));
        if (toc.classList.contains('is-open')) {
            // 展开状态下点标题则收起；点链接由链接自己的监听器处理，这里不干预
            if (clickedTitle) {
                toc.classList.remove('is-open');
                e.preventDefault();
            }
        } else {
            toc.classList.add('is-open');
            e.preventDefault();
        }
    } else {
        toc.classList.remove('is-open');
    }
});

// 3. 搜索结果分类路径（电脑端）

var searchCategoryMap = {
    '/zh-cn/games/pc': '游戏 > 电脑游戏',
    '/zh-cn/games/HVgame': '游戏 > 虚拟化游戏',
    '/zh-cn/games/switch': '游戏 > Switch游戏',
    '/zh-cn/games/android': '游戏 > 安卓游戏',
    '/zh-cn/games/page': '游戏',
    '/zh-cn/movie/popular': '电影 > 热门电影',
    '/zh-cn/movie/classic': '电影 > 经典电影',
    '/zh-cn/movie/series': '电影 > 系列电影',
    '/zh-cn/movie/animefilms': '电影 > 动画电影',
    '/zh-cn/movie/page': '电影',
    '/zh-cn/tv/china': '电视剧 > 国产剧',
    '/zh-cn/tv/occident': '电视剧 > 欧美剧',
    '/zh-cn/tv/jpandsk': '电视剧 > 日韩剧',
    '/zh-cn/tv/page': '电视剧',
    '/zh-cn/animetv/gcdm': '动画剧集 > 国产动漫',
    '/zh-cn/animetv/rbdm': '动画剧集 > 日本动漫',
    '/zh-cn/animetv/omdm': '动画剧集 > 欧美动漫',
    '/zh-cn/animetv/xpy': '动画剧集 > 小朋友动画',
    '/zh-cn/animetv/page': '动画剧集',
    '/zh-cn/documentary': '纪录片',
    '/zh-cn/books': '书籍、漫画、有声读物',
    '/zh-cn/music': '音乐、演唱会、MV',
    '/zh-cn/others': '综艺、教学视频、其他',
    '/zh-cn/bbs': '留言板',
    '/zh-cn/dashang': '打赏'
};

function getCategoryPath(url) {
    if (!url) return '';
    var cleanUrl = url.replace(/^#/, '').split('?')[0];
    var longestMatch = '';
    for (var path in searchCategoryMap) {
        if (cleanUrl.indexOf(path) === 0 && path.length > longestMatch.length) {
            longestMatch = path;
        }
    }
    return longestMatch ? searchCategoryMap[longestMatch] : '';
}

function addCategoryToSearchResults() {
    // 本地化搜索结果状态文本（v5 硬编码了英文 "Found X results"）
    var status = document.querySelector('.search .results-status');
    if (status) {
        var m = status.textContent.match(/^Found (\d+) results$/);
        if (m) status.textContent = '找到 ' + m[1] + ' 个结果';
    }

    var results = document.querySelectorAll('.search .results-panel .matching-post a');
    if (results.length === 0) return;

    results.forEach(function (link) {
        if (link.querySelector('.result-category')) return;

        var href = link.getAttribute('href');
        var category = getCategoryPath(href);

        if (category) {
            var categorySpan = document.createElement('span');
            categorySpan.className = 'result-category';
            categorySpan.textContent = category;
            var titleEl = link.querySelector('p.title') || link.querySelector('h2');
            if (titleEl) {
                link.insertBefore(categorySpan, titleEl);
            } else {
                link.insertBefore(categorySpan, link.firstChild);
            }
        }
    });
}

// 桌面端搜索改为「停止输入后延迟自动搜索」：官方 search 插件原生是 input 即时搜索（约 100ms 防抖，无配置项），
// 每次 input 都触发全量索引遍历 + 正则匹配，索引量大时边打字边卡。这里在 document 捕获阶段拦截官方搜索框
// （.search input[type=search]）的真实 input 事件，阻止官方即时搜索；仅在用户停止输入 SEARCH_DEBOUNCE_MS 毫秒后，
// 才派发一次带 __bypass 标志的放行 input 事件让官方执行搜索（相当于把响应延迟调大，避免边打字边卡）。
// __bypass 标志区分「用户真实输入」与「我们主动派发的放行事件」。不修改官方 CDN 文件，纯前端、可撤销。
var SEARCH_DEBOUNCE_MS = 400;
function enhanceSearchDebounce() {
    if (window.__searchDebounceEnhanced) return;
    // 注意：不在这里立即置标志，等搜索框确实出现后再置，避免「假完成」导致后续不再重试。

    var debounceTimer = null;

    // document 级拦截监听直接安装（不依赖搜索框是否存在）：捕获阶段先于官方监听器，
    // 仅当事件目标确为官方搜索框时才拦截/放行，其它 input 不受影响。
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t || !t.matches || !t.matches('.search input[type="search"]')) return;
        if (e.__bypass) return;        // 我们自己派发的放行事件：继续传播到官方监听器
        e.stopPropagation();           // 拦截：不让官方在每次输入时搜索
        // 防抖：停止输入 SEARCH_DEBOUNCE_MS 后才放行一次
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            var evt = new Event('input', { bubbles: true });
            evt.__bypass = true;
            t.dispatchEvent(evt);
        }, SEARCH_DEBOUNCE_MS);
    }, true);

    // 等待官方 .search input 出现后置位标志（仅用于避免重复初始化），最多重试 ~5s
    function markReady(retry) {
        if (document.querySelector('.search input[type="search"]')) {
            window.__searchDebounceEnhanced = true;
            return;
        }
        if (retry > 0) return setTimeout(function () { markReady(retry - 1); }, 200);
    }
    markReady(25);
}

function initSearchObserver() {
    enhanceSearchDebounce();

    var searchInput = document.querySelector('.search input[type="search"]');
    if (searchInput) {
        // 真实 input 事件已被 enhanceSearchDebounce 拦截（不再触发官方即时搜索），
        // 分类标签改由下方 MutationObserver 在结果渲染后兜底添加。
        searchInput.addEventListener('focus', function () {
            setTimeout(addCategoryToSearchResults, 300);
        });
    }

    var searchArea = document.querySelector('.search');
    if (searchArea) {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    setTimeout(addCategoryToSearchResults, 200);
                }
            });
        });
        observer.observe(searchArea, { childList: true, subtree: true });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initSearchObserver, 1000);
});


// 4. 手机端底部导航栏交互
document.addEventListener('DOMContentLoaded', function () {
    var mobileNavMore = document.getElementById('mobileNavMore');
    var mobileNavPopup = document.getElementById('mobileNavPopup');
    var mobileNavSearch = document.getElementById('mobileNavSearch');
    var mobileSearchInput = document.getElementById('mobileSearchInput');
    var mobileSearchBtn = document.getElementById('mobileSearchBtn');
    var submenuItems = document.querySelectorAll('.mobile-nav-has-submenu');

    function closeAllMenus(exclude) {
        document.querySelectorAll('.mobile-nav-submenu, .mobile-nav-more-popup').forEach(function (menu) {
            if (menu !== exclude) menu.classList.remove('show');
        });
    }

    if (mobileNavMore && mobileNavPopup) {
        mobileNavMore.onclick = function (e) {
            e.stopPropagation();
            closeAllMenus(mobileNavPopup);
            mobileNavPopup.classList.toggle('show');
        };

        mobileNavPopup.addEventListener('click', function (e) {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                mobileNavPopup.classList.remove('show');
            }
        });
    }

    var mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
    var mobileSearchClose = document.getElementById('mobileSearchClose');
    var mobileSearchResults = document.getElementById('mobileSearchResults');

    // 复用官方 search：把关键词填入官方 .search input 并触发输入，官方搜索框渲染结果到
    // .search .results-panel（位于抽屉侧边栏内），由 MutationObserver 搬运到手机 overlay。
    // 官方结果链接自带 ?id= 参数，点击后 docsify core 自动路由并定位到对应标题
    //（与桌面端搜索行为完全一致），无需任何自写滚动补丁。
    var officialResultsObserver = null;

    function syncOfficialResultsToMobile() {
        if (!mobileSearchResults) return;
        var panel = document.querySelector('.search .results-panel');
        if (!panel) return;

        var posts = panel.querySelectorAll('.matching-post');
        if (posts.length === 0) {
            var status = document.querySelector('.search .results-status');
            var statusText = status ? (status.textContent || '').trim() : '';
            // 官方 "Found X results" 表示命中；其余（无关键词/无结果提示）视为空
            if (statusText && statusText.indexOf('Found') !== 0) {
                mobileSearchResults.innerHTML = '<div class="mobile-search-no-results"><svg><use href="#icon-inbox"/></svg> 没有找到相关结果</div>';
            } else {
                mobileSearchResults.innerHTML = '';
            }
            mobileSearchResults.classList.add('has-content');
            return;
        }

        // 给官方结果注入中文分类面包屑（复用桌面端逻辑，克隆后随之带上面包屑）
        addCategoryToSearchResults();

        var list = document.createElement('div');
        list.className = 'mobile-search-results-list';
        posts.forEach(function (post) {
            list.appendChild(post.cloneNode(true));
        });

        mobileSearchResults.innerHTML = '';
        mobileSearchResults.appendChild(list);
        mobileSearchResults.classList.add('has-content');

        // 点击官方结果（克隆）：主动接管导航。
        // 关键：不可调用 stopPropagation，否则会阻断 docsify 全局 click 监听设置 navigating 标志，
        // 导致 hashchange 时 source==='history'、core 提前 return、不滚动到 ?id= 标题。
        // 这里 preventDefault + 手动设置 location.hash：docsify 仍按 'navigate' 处理并自动定位。
        list.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var href = a.getAttribute('href') || '';
                if (mobileSearchOverlay) mobileSearchOverlay.classList.remove('show');
                document.body.classList.remove('search-active');
                if (href) {
                    location.hash = href.charAt(0) === '#' ? href : '#' + href;
                }
            });
        });
    }

    function initSearchResultSync() {
        if (officialResultsObserver) return;
        var panel = document.querySelector('.search .results-panel');
        if (!panel) return;
        officialResultsObserver = new MutationObserver(function () {
            syncOfficialResultsToMobile();
        });
        officialResultsObserver.observe(panel, { childList: true, subtree: true });
    }

    function doSearch(keyword) {
        // 触发官方 search 输入框，结果由 observer 同步到 overlay
        try {
            var searchInput = document.querySelector('.search input[type="search"]');
            if (searchInput) {
                searchInput.value = keyword;
                var evt = new Event('input', { bubbles: true });
                evt.__bypass = true; // 标记为放行事件，跳过 enhanceSearchDebounce 的拦截（否则手机端搜索被吞）
                searchInput.dispatchEvent(evt);
            }
        } catch (e) {
            // 搜索框触发失败，静默处理
        }
        initSearchResultSync();
    }

    function performSearch(keyword) {
        if (!keyword || !mobileSearchResults) return;

        mobileSearchResults.innerHTML = '<div class="mobile-search-loading"><svg class="icon-spin"><use href="#icon-spinner"/></svg> 搜索中...</div>';

        setTimeout(function () {
            doSearch(keyword);
        }, 100);
    }

    function closeSearchOverlay() {
        if (mobileSearchOverlay) {
            mobileSearchOverlay.classList.remove('show');
        }
        if (mobileSearchResults) {
            mobileSearchResults.innerHTML = '';
            mobileSearchResults.classList.remove('has-content');
        }
        document.body.classList.remove('search-active'); // 恢复正文 TOC 显示
    }

    if (mobileNavSearch && mobileSearchOverlay) {
        mobileNavSearch.onclick = function (e) {
            e.stopPropagation();
            closeAllMenus();
            mobileSearchOverlay.classList.add('show');
            document.body.classList.add('search-active');
            if (mobileSearchInput) {
                mobileSearchInput.focus();
            }
            if (mobileSearchResults) {
                mobileSearchResults.innerHTML = '';
                mobileSearchResults.classList.remove('has-content');
            }
        };

        if (mobileSearchClose) {
            mobileSearchClose.onclick = function (e) {
                e.stopPropagation();
                closeSearchOverlay();
            };
        }

        if (mobileSearchOverlay) {
            mobileSearchOverlay.onclick = function (e) {
                if (e.target.closest('.mobile-search-close')) return;
                if (e.target === mobileSearchOverlay) {
                    closeSearchOverlay();
                }
                // 注意：不可调用 e.stopPropagation()，否则会阻断 docsify 全局 click 监听设置
                // navigating 标志，使搜索结果点击后 source==='history'，core 提前 return、不滚动到 ?id= 标题。
            };
        }

        if (mobileSearchBtn) {
            mobileSearchBtn.onclick = function (e) {
                e.stopPropagation();
                var keyword = mobileSearchInput ? mobileSearchInput.value.trim() : '';
                if (keyword) {
                    performSearch(keyword);
                }
            };
        }

        if (mobileSearchInput) {
            mobileSearchInput.onkeydown = function (e) {
                if (e.key === 'Enter') {
                    var keyword = mobileSearchInput.value.trim();
                    if (keyword) {
                        performSearch(keyword);
                    }
                }
                if (e.key === 'Escape') {
                    closeSearchOverlay();
                }
            };
        }
    }

    submenuItems.forEach(function (item) {
        item.onclick = function (e) {
            e.stopPropagation();
            var submenuId = 'submenu-' + item.getAttribute('data-submenu');
            var submenu = document.getElementById(submenuId);

            if (submenu) {
                closeAllMenus(submenu);
                submenu.classList.toggle('show');
            }
        };
    });

    document.addEventListener('click', function (e) {
        if (mobileSearchOverlay && mobileSearchOverlay.classList.contains('show')) {
            if (e.target.closest('.mobile-search-close')) {
                closeSearchOverlay();
                return;
            }
            if (!e.target.closest('.mobile-search-overlay')) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }

        if (!e.target.closest('.mobile-nav') && !e.target.closest('.mobile-search-overlay')) {
            closeAllMenus();
        }
    }, true);

    document.addEventListener('click', function (e) {
        if (e.target.closest('.mobile-nav-submenu a')) {
            closeAllMenus();
        }
    });

    function updateActiveNav() {
        // 站点用 hash 路由（routerMode:'hash'），location.pathname 恒为 '/'，
        // 必须解析 location.hash 的路由前缀才能正确高亮底部导航。
        var hash = (window.location.hash || '').replace(/^#/, '');
        hash = hash.split('?')[0]; // 去掉 ?id= 等查询参数
        var seg = hash.split('/').filter(Boolean); // ['zh-cn','games','pc']
        // 底部「游戏/电影/剧集/动漫」为子菜单触发器，按路由第二段前缀匹配高亮
        var prefixBySub = { games: 'games', movie: 'movie', tv: 'tv', animetv: 'animetv' };

        var navItems = document.querySelectorAll('.mobile-nav-item[data-path], .mobile-nav-item[data-submenu]');
        navItems.forEach(function (item) {
            var active = false;
            if (item.hasAttribute('data-path')) {
                var p = (item.getAttribute('data-path') || '').replace(/^\//, '');
                active = (hash === '' || hash === '/' || hash.replace(/^\//, '') === p);
            } else if (item.hasAttribute('data-submenu')) {
                var sub = item.getAttribute('data-submenu');
                active = seg[1] === prefixBySub[sub];
            }
            if (active) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateActiveNav();

    window.addEventListener('popstate', updateActiveNav);
    window.addEventListener('hashchange', updateActiveNav);
});

// 5. 站点运行时间统计

function calculateRunTime() {
    var startDate = new Date(2024, 3, 3, 21, 0, 0);
    var now = new Date();
    var diff = now - startDate;

    var seconds = Math.floor(diff / 1000) % 60;
    var minutes = Math.floor(diff / (1000 * 60)) % 60;
    var hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var years = Math.floor(days / 365);
    var remainingDays = days % 365;
    return {
        years: years,
        days: remainingDays,
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };
}

function updateSiteTime() {
    var timeInfo = calculateRunTime();
    var timeElement = document.getElementById("sitetime");

    if (timeElement) {
        timeElement.innerHTML = '本网站已运行 ' + timeInfo.years + '年 ' + timeInfo.days + '天 ' + timeInfo.hours + '时 ' + timeInfo.minutes + '分 ' + timeInfo.seconds + '秒';
    }
}

var siteTimeInterval = setInterval(updateSiteTime, 1000);

if (document.readyState === "complete") {
    updateSiteTime();
} else {
    window.addEventListener("load", function () {
        updateSiteTime();
    });
}

window.addEventListener('beforeunload', function () {
    clearInterval(siteTimeInterval);
});

// 7.5 搜索索引定制：只索引 H4 标题，排除 H1~H3，H4 不含正文
// 背景：docsify v5 官方 search 插件只有 depth（最大标题层级）选项，无法"只取某一级"。
// 其 genIndex() 内部用 window.marked.lexer(content) 解析页面（search.js 源码实锤）；
// 而核心页面渲染走 marked 实例内部 lexer（compiler.js 已核实），不调用全局 window.marked.lexer。
// 因此包装 window.marked.lexer 只影响搜索索引生成，不破坏正文显示。
// 过滤逻辑：检测到调用来自 search 脚本时，将 depth<4 的 heading 降级为 html（不建条目）、
// 清空所有非 heading token 的 text（H4 条目 body 置空）→ 结果仅剩 H4 标题且不含正文。
function patchSearchIndexToH4Only() {
    if (typeof window.marked === 'undefined' || typeof window.marked.lexer !== 'function') return;
    if (window.__searchH4Patched) return;
    window.__searchH4Patched = true;

    var originalLexer = window.marked.lexer.bind(window.marked);

    function isFromSearchScript() {
        var e = new Error();
        var stack = e.stack || '';
        // 调用栈中出现 search 插件脚本即判定为搜索索引调用
        return /search(\.min)?\.js/i.test(stack);
    }

    window.marked.lexer = function (src) {
        var tokens = originalLexer(src);
        if (!isFromSearchScript()) return tokens; // 非搜索场景一律原样返回

        var filtered = [];
        tokens.forEach(function (tok) {
            if (tok.type === 'heading') {
                if (tok.depth === 4) {
                    tok.body = '';
                    filtered.push(tok); // 仅保留 H4 作为索引条目
                }
                // depth<4 的 heading：丢弃，不进索引
                return;
            }
            // 非 heading token（段落/列表/表格/代码等）：清空 text，使 H4 条目 body 为空
            if (tok && 'text' in tok) tok.text = '';
            return; // 不推入过滤结果，彻底排除正文
        });
        return filtered;
    };
}

// site.js 在 docsify + search 插件之后同步加载，window.marked 已存在，立即 patch
// 避免搜索插件在 DOMContentLoaded 时抢先建索引，导致 H1~H3/正文漏进 IndexedDB
patchSearchIndexToH4Only();

// 兜底：若 site.js 被延迟加载或 marked 尚未就绪，再次尝试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        patchSearchIndexToH4Only();
    });
} else {
    patchSearchIndexToH4Only();
}

// 8. PC 端网盘链接转二维码（点击展开）
// 识别夸克 / 迅雷 / 百度 / 阿里 网盘链接，默认隐藏原始链接，只显示「XX二维码」按钮，点击展开二维码。
// 仅 PC 端执行（手机端由 isMobileDevice() 拦截，且 CSS 媒体查询双保险隐藏）。

function netdiskType(href) {
    if (/quark/i.test(href)) return '夸克';
    if (/xunlei/i.test(href)) return '迅雷';
    if (/baidu/i.test(href)) return '百度';
    if (/aliyun|alipan/i.test(href)) return '阿里';
    return null;
}

// 不转换二维码、保留原始链接的页面：home.md（根路径 #/）与各分类 page.md（/xxx/page）
function isQrExcludedRoute() {
    var hash = (location.hash || '').replace(/^#/, '');
    hash = hash.split('?')[0]; // 去掉 ?id= 等查询参数
    if (hash === '' || hash === '/') return true; // 根路径 = home.md
    var seg = hash.split('/').filter(Boolean);
    var last = seg[seg.length - 1] || '';
    // page.md 落地页 或 home.md（#/home 在 docsify 中也会解析为 home.md）
    return last === 'page' || last === 'home';
}

// 全局点击：点击二维码区域外的任意位置，自动关闭所有已展开的二维码（只绑定一次）
if (!window.__qrOutsideCloseBound) {
    document.addEventListener('click', function (e) {
        // 点击发生在某个二维码按钮/弹出区域内时不处理，交由按钮自身逻辑负责
        if (e.target.closest && e.target.closest('.netdisk-qr')) return;
        document.querySelectorAll('.netdisk-qr.is-open').forEach(function (openWrap) {
            openWrap.classList.remove('is-open');
            var openBtn = openWrap.querySelector('.netdisk-qr__btn');
            if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
        });
    });
    window.__qrOutsideCloseBound = true;
}

function renderNetdiskQrcodes() {
    // 各网盘类型对应的 accent 类名（用于按钮配色）
    var accentMap = { '夸克': 'quark', '迅雷': 'xunlei', '百度': 'baidu', '阿里': 'aliyun' };

    // home.md / page.md 落地页不转换二维码，链接保持原样显示
    if (isQrExcludedRoute()) return;

    var content = document.querySelector('.markdown-section');
    if (!content) return;

    var isMobile = isMobileDevice();

    // PC 端依赖二维码库，未就绪则跳过；移动端只生成按钮、点击直接跳转，不依赖 QRCode
    if (!isMobile && typeof QRCode === 'undefined') return;

    var links = content.querySelectorAll('a[href]');
    links.forEach(function (link) {
        var href = link.getAttribute('href') || '';
        // 只处理 http(s) 外部网盘链接
        if (!/^https?:\/\//i.test(href)) return;
        var type = netdiskType(href);
        if (!type) return;
        // 避免对已经包裹过的链接重复处理
        if (link.dataset.qrBound === '1') return;
        link.dataset.qrBound = '1';

        var accent = accentMap[type] || 'quark';

        var label = type + '网盘';
        var wrap = document.createElement('span');
        wrap.className = 'netdisk-qr';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'netdisk-qr__btn netdisk-qr__btn--' + accent;
        btn.textContent = label;
        btn.setAttribute('aria-expanded', 'false');

        // 移动端：按钮点击在新窗口打开网盘链接（不生成二维码、不创建弹层、不占用当前页）
        if (isMobile) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var a = document.createElement('a');
                a.href = href;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        } else {
            btn.setAttribute('aria-expanded', 'false');

            var box = document.createElement('div');
            box.className = 'netdisk-qr__box';

            // 二维码上方提示文案（按网盘类型动态生成：夸克网盘APP扫码获取 / 迅雷网盘APP扫码获取 …）
            var hint = document.createElement('div');
            hint.className = 'netdisk-qr__hint';
            hint.textContent = type + '网盘APP扫码获取';
            box.appendChild(hint);

            btn.addEventListener('click', function (e) {
                e.preventDefault();

                // 互斥：展开当前前先关闭页面上其他已展开的二维码
                document.querySelectorAll('.netdisk-qr.is-open').forEach(function (openWrap) {
                    if (openWrap !== wrap) {
                        openWrap.classList.remove('is-open');
                        var openBtn = openWrap.querySelector('.netdisk-qr__btn');
                        if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
                    }
                });

                if (wrap.dataset.rendered !== '1') {
                    // 懒生成：首次点击才真正绘制二维码，避免页面一次性绘制几十个
                    try {
                        new QRCode(box, {
                            text: href,
                            width: 160,
                            height: 160,
                            colorDark: '#000000',
                            colorLight: '#ffffff',
                            correctLevel: QRCode.CorrectLevel.M
                        });
                        // 清除 qrcodejs 给容器设置的 title（=真实链接），
                        // 否则鼠标移上去会弹出原生 tooltip 显示真实链接
                        box.removeAttribute('title');
                        // 同时清除内部 img 的 title/alt（防御：某些构建可能设置）
                        box.querySelectorAll('img').forEach(function (img) {
                            img.removeAttribute('title');
                            img.removeAttribute('alt');
                        });
                        wrap.dataset.rendered = '1';
                    } catch (err) {
                        return;
                    }
                }
                var open = wrap.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });

            wrap.appendChild(box);
        }

        wrap.appendChild(btn);
        if (link.nextSibling) {
            link.parentNode.insertBefore(wrap, link.nextSibling);
        } else {
            link.parentNode.appendChild(wrap);
        }

        // 默认隐藏原始网盘链接（长 URL），只显示「XX二维码」按钮
        link.style.display = 'none';
        // 同时隐藏链接前面的「夸克：」「迅雷：」「百度：」「阿里：」等网盘类型前缀
        var prevNode = link.previousSibling;
        if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
            var prevText = prevNode.textContent || '';
            if (/^\s*(夸克|迅雷|百度|阿里)\s*[：:]?\s*$/i.test(prevText)) {
                prevNode.textContent = '';
            }
        }
    });
}
