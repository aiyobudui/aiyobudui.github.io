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
                // 统一走锚点系统：瞬时到位 + 落点稳定 + 左侧色条高亮，
                // 否则 TOC 点击成了「唯一没有高亮反馈」的跳转入口（与搜索结果体验不一致）。
                if (typeof seekTargetAnchor === 'function') {
                    seekTargetAnchor(target, true);
                } else {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
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

// 2.5 电脑游戏分页：切换分页后回到页面顶部
// 背景：站点为保留搜索结果「定位到 ?id= 标题」的能力而设 auto2top:false，
// 代价是切页会沿用上一页的滚动位置——从页底点「下一页」会直接落在下一页底部，非常突兀。
// 这里只对「电脑游戏分页路径且 hash 不带 ?id= 锚点」的导航回顶；
// 搜索结果链接必然自带 ?id=（v5 search 生成），因此绝不受影响。
function resetScrollForPagedGames() {
    var h = location.hash || '';
    if (!/^#\/zh-cn\/games\/pc(-\d+)?$/.test(h)) return;
    window.scrollTo(0, 0);
}

// 3. 搜索结果分类路径（电脑端）

var searchCategoryMap = {
    '/zh-cn/games/pc': '游戏 > 电脑游戏',
    // 电脑游戏分页（「已有游戏」拆分为 12 页，最长前缀匹配，需在 /zh-cn/games/pc 之后仍能命中更长的分页路径）
    '/zh-cn/games/pc-1': '游戏 > 电脑游戏 第1页',
    '/zh-cn/games/pc-2': '游戏 > 电脑游戏 第2页',
    '/zh-cn/games/pc-3': '游戏 > 电脑游戏 第3页',
    '/zh-cn/games/pc-4': '游戏 > 电脑游戏 第4页',
    '/zh-cn/games/pc-5': '游戏 > 电脑游戏 第5页',
    '/zh-cn/games/pc-6': '游戏 > 电脑游戏 第6页',
    '/zh-cn/games/pc-7': '游戏 > 电脑游戏 第7页',
    '/zh-cn/games/pc-8': '游戏 > 电脑游戏 第8页',
    '/zh-cn/games/pc-9': '游戏 > 电脑游戏 第9页',
    '/zh-cn/games/pc-10': '游戏 > 电脑游戏 第10页',
    '/zh-cn/games/pc-11': '游戏 > 电脑游戏 第11页',
    '/zh-cn/games/pc-12': '游戏 > 电脑游戏 第12页',
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
// 手机端搜索遮罩的自动搜索防抖。手机端不走 enhanceSearchDebounce 的官方拦截路径
// （遮罩输入框是自建元素，官方搜索由 performSearch 主动派发），故单独一个常量。
var MOBILE_SEARCH_DEBOUNCE_MS = 450;
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

        // 点击搜索结果标题 = 明确的「跳到这个标题」意图：
        // 标记 __anchorForceSeek，doneEach 里会强制滚动到目标并加高亮。
        // 注意：绝不可 stopPropagation / preventDefault（会破坏 docsify 的 navigating 标志，
        // 导致 source==='history'、core 提前 return、连 ?id= 定位都失效）。
        searchArea.addEventListener('click', function (e) {
            var a = e.target.closest ? e.target.closest('.results-panel a[href*="?id="]') : null;
            if (!a) return;
            window.__anchorForceSeek = true;
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initSearchPrefetch();
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
                    // 明确的跳转意图：doneEach 里强制滚动到目标标题并加高亮
                    if (href.indexOf('?id=') >= 0) window.__anchorForceSeek = true;
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
            // 与桌面端一致：停止输入 MOBILE_SEARCH_DEBOUNCE_MS 毫秒后自动搜索。
            // 此前手机端只监听 Enter / 点按钮 → 用户输入完盯着空结果区，
            // 以为要点两次（第一次「提交」+ 第二次才出结果），这就是「双击」的根因。
            var mobileSearchTimer = null;
            mobileSearchInput.oninput = function () {
                clearTimeout(mobileSearchTimer);
                var keyword = mobileSearchInput.value.trim();
                if (!keyword) {
                    // 清空输入 → 立即清空结果，不留上次的残留
                    if (mobileSearchResults) {
                        mobileSearchResults.innerHTML = '';
                        mobileSearchResults.classList.remove('has-content');
                    }
                    return;
                }
                mobileSearchTimer = setTimeout(function () {
                    performSearch(keyword);
                }, MOBILE_SEARCH_DEBOUNCE_MS);
            };

            mobileSearchInput.onkeydown = function (e) {
                if (e.key === 'Enter') {
                    // 回车 = 立即搜索（不等防抖），并取消待触发的自动搜索
                    clearTimeout(mobileSearchTimer);
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

// 当前路由标识（不含 ?id= 等查询参数），用于判断页面是否已跳走
function currentRouteKey() {
    return (location.hash || '').split('?')[0];
}

// 延迟到浏览器空闲时执行；不支持 requestIdleCallback 时退化为 setTimeout
function scheduleIdle(fn) {
    if (window.requestIdleCallback) {
        window.requestIdleCallback(fn, { timeout: 400 });
    } else {
        setTimeout(fn, 30);
    }
}

// 从 location.hash 取出 ?id= 的目标 id；没有则返回 null
function routeAnchorId() {
    var hash = location.hash || '';
    var qIdx = hash.indexOf('?id=');
    if (qIdx < 0) return null;
    var raw = hash.slice(qIdx + 4);
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
}

// 目标标题跳转后的视觉高亮：
// docsify 核心只负责把标题滚进视口，不做任何标记 → 用户看不出「跳到哪了」。
// 这里给目标标题（或其外层 callout/blockquote）加 .anchor-flash 类，
// 用左侧色条 + 浅蓝底 + 轻微左移动画提示位置，约 2.6s 后自动淡出并移除。
// 高亮元素优先取标题所在的行内块容器（h4 本身很窄且是 block，直接着色会显得突兀）。
var ANCHOR_FLASH_MS = 2600;

function clearAnchorFlash() {
    clearTimeout(window.__anchorFlashTimer);
    window.__anchorFlashTimer = null;
    var old = document.querySelectorAll('.anchor-flash');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('anchor-flash');
}

function flashRouteAnchor(el) {
    if (!el) return;
    // 先整体清场：既移除旧高亮，也取消上一轮尚未到期的淡出定时器。
    // 否则连续点击第二个结果时，第一个的定时器会把新加的高亮一起摘掉（实测 flash=0）。
    clearAnchorFlash();
    // 标题自身足够短且是块级，直接高亮标题行；若标题在 callout/blockquote 内则高亮整块更醒目
    var box = el.closest('blockquote, .callout, .markdown-section > ul > li > p') || el;
    box.classList.add('anchor-flash');
    // 重启动画：强制 reflow，保证连续跳转同一标题也会重播动画
    void box.offsetWidth;
    window.__anchorFlashTimer = setTimeout(function () {
        window.__anchorFlashTimer = null;
        var cur = document.querySelectorAll('.anchor-flash');
        for (var j = 0; j < cur.length; j++) cur[j].classList.remove('anchor-flash');
    }, ANCHOR_FLASH_MS);
}

// 滚动到当前 ?id= 目标标题并高亮它。
// 站点 auto2top:false 下，docsify 核心只在 source==='navigate' 时滚动，
// 把目标标题精确停到视口顶部下方 anchorOffset 处（用绝对坐标，不依赖 scrollIntoView）。
// 关键：必须用「瞬时」跳转而非 behavior:'smooth'——
// 本站的网盘链接是 IntersectionObserver 懒转换（rootMargin 200px），
// 平滑滚动途经的每一屏都会触发转换、令页面变矮，把滚动终点不断上移，
// 结果是滚动被"甩"在原地、标题停在视口外（实测可达 4760px / 5982px 之外）。
// 瞬时跳转则一次性到位，随后发生的转换只会影响目标「下方」的内容，落点稳定。
function scrollAnchorToTop(el) {
    var margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    var y = el.getBoundingClientRect().top + window.pageYOffset - margin;
    // 目标靠近文档末尾时无解：即使滚到底也停不到顶部（这是正常边界，不是 bug）。
    // 此时显式滚到底，保证目标落在视口内可见，而不是停在中途。
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var target = Math.max(0, Math.round(y));
    if (target > maxY) target = Math.max(0, maxY);
    window.scrollTo(0, target);
}

// 首屏加载 / history 回退 / 页面高度收缩后都可能「没滚到位」→ 这里统一兜底。
// force=true：无视当前位置强制滚到标题（用于点击搜索结果等明确跳转）；
// force=false：仅当标题不在视口内时才滚动（避免打断用户手动滚动）。
function seekRouteAnchor(force) {
    var id = routeAnchorId();
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    seekTargetAnchor(el, force);
}

// 对「已知元素」执行锚点定位 + 高亮（搜索结果、正文内 TOC 共用同一条路径）。
function seekTargetAnchor(el, force) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var inView = rect.top >= 0 && rect.top < vh * 0.6;
    if (force || !inView) {
        scrollAnchorToTop(el);
        // 核心自带的 smooth 滚动（core #S 方法）与页面高度收缩可能在此后把落点带偏，
        // 连续校正几次直到稳定；用户一旦主动滚动（wheel/touch/keydown）立即停止校正。
        scheduleAnchorCorrection(el);
    }
    flashRouteAnchor(el);
}

// 落点稳定器：目标上方的网盘链接被懒转换成按钮后页面会变矮，
// 会把已经滚好的目标往上/往下顶偏。这里在若干帧内反复把目标对回视口顶部，
// 直到连续两次测量一致；用户任何主动滚动行为都会立即取消（不打断用户）。
function scheduleAnchorCorrection(el) {
    var targetId = el.id;
    var tries = 0;
    var lastTop = null;
    var cancelled = false;

    // 上一轮遗留的 cancel 监听必须清掉：它们用 { once:true } 注册，
    // 若这一轮没人再踩它们，就会一直挂在 window 上，
    // 到了下一轮被触发时反而把「新一轮」的校正提前取消（连续点击时 flash/落点异常的真凶之一）。
    if (window.__anchorCorrectionCancel) {
        window.__anchorCorrectionCancel();
    }

    function cancel() { cancelled = true; }
    var events = ['wheel', 'touchstart', 'keydown'];
    events.forEach(function (ev) {
        window.addEventListener(ev, cancel, { passive: true });
    });
    // 暴露一个「解绑 + 标记取消」的句柄，供下一轮调用时先清理自己
    window.__anchorCorrectionCancel = function () {
        cancelled = true;
        events.forEach(function (ev) {
            window.removeEventListener(ev, cancel);
        });
        window.__anchorCorrectionCancel = null;
    };
    var detach = window.__anchorCorrectionCancel;

    function step() {
        if (cancelled) { detach(); return; }
        // 路由已变（用户切到别的页）→ 停止
        if (location.hash.indexOf('?id=') < 0) { detach(); return; }
        var cur = document.getElementById(targetId);
        if (!cur) { detach(); return; }
        var margin = parseFloat(getComputedStyle(cur).scrollMarginTop) || 0;
        var top = Math.round(cur.getBoundingClientRect().top);
        // 目标已进入「顶部附近」且连续两帧不动 → 稳定，收工
        if (Math.abs(top - margin) <= 4) {
            if (lastTop !== null && Math.abs(top - lastTop) <= 1) { detach(); return; }
        }
        lastTop = top;
        // 距期望落点超过 4px → 校正（撞底时 scrollAnchorToTop 内部会夹到 maxY）
        if (Math.abs(top - margin) > 4) scrollAnchorToTop(cur);
        if (++tries < 20) requestAnimationFrame(step); else detach();
    }
    requestAnimationFrame(step);
}

// 若当前仍是「搜索结果 ?id= 定位」导航，重新滚动到目标标题：
// 分片处理二维码时页面高度会随「隐藏链接→换成按钮」逐步收缩，
// 目标标题的绝对位置会随之向上偏移，全部处理完后需要再定位一次。
function reseekRouteAnchor() {
    var id = routeAnchorId();
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (rect.top < 0) {
        // 被顶出视口了才重定位，避免打断用户在处理期间的手动滚动
        scrollAnchorToTop(el);
    }
    flashRouteAnchor(el);
}

// 单个网盘链接的包装逻辑（从原 renderNetdiskQrcodes 内联体抽出，供分片处理复用）
function wrapNetdiskLink(link, isMobile) {
    var href = link.getAttribute('href') || '';
    var type = netdiskType(href);
    var accentMap = { '夸克': 'quark', '迅雷': 'xunlei', '百度': 'baidu', '阿里': 'aliyun' };
    var accent = accentMap[type] || 'quark';

    link.dataset.qrBound = '1';

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
}

function renderNetdiskQrcodes() {
    var content = document.querySelector('.markdown-section');
    if (!content) return;

    // home.md / page.md 落地页不转换二维码，链接保持原样显示
    if (isQrExcludedRoute()) return;

    var isMobile = isMobileDevice();

    // PC 端依赖二维码库，未就绪则跳过；移动端只生成按钮、点击直接跳转，不依赖 QRCode
    if (!isMobile && typeof QRCode === 'undefined') return;

    // 收集本页需要处理的网盘链接（大页面可能一次性有数千个）
    var links = content.querySelectorAll('a[href]');
    var pending = [];
    links.forEach(function (link) {
        var href = link.getAttribute('href') || '';
        // 只处理 http(s) 外部网盘链接
        if (!/^https?:\/\//i.test(href)) return;
        if (!netdiskType(href)) return;
        // 避免对已经包裹过的链接重复处理
        if (link.dataset.qrBound === '1') return;
        pending.push(link);
    });
    if (pending.length === 0) return;

    // 记录当前路由：页面跳走后必须立即中止，
    // 避免残留的任务操作到新页面已替换的 DOM
    var routeKey = currentRouteKey();

    // 断开上一次渲染遗留的 observer（切页时旧节点已被 docsify 替换）
    if (window.__qrIO && typeof window.__qrIO.disconnect === 'function') {
        window.__qrIO.disconnect();
    }

    // 懒转换：仅对「进入视口（含 200px 预加载余量）」的链接生成二维码按钮，
    // 避免 pc.md（3834 个链接）一次性创建数千 DOM 节点导致打开页面时 CPU 100%、卡死。
    // 功能完全不变——用户滚动到某链接时它才被转换为按钮，点击照常展开二维码。
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries, obs) {
            // 路由已变化：立即放弃（新页面由自己的 doneEach 触发新一轮处理）
            if (currentRouteKey() !== routeKey) { obs.disconnect(); return; }
            entries.forEach(function (entry) {
                if (entry.isIntersecting && entry.target.dataset.qrBound !== '1') {
                    wrapNetdiskLink(entry.target, isMobile);
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px 0px' });
        window.__qrIO = io;
        pending.forEach(function (link) { io.observe(link); });
        // 带 ?id= 的搜索结果定位：首屏转换后页面高度会收缩，重定位一次目标标题
        setTimeout(reseekRouteAnchor, 400);
        return;
    }

    // 降级方案（不支持 IntersectionObserver 的浏览器）：分片处理，
    // 把「创建数千个按钮 + 隐藏链接」的同步开销移出页面切换的关键路径
    var idx = 0;
    var CHUNK_SIZE = 80; // 每批处理数量：控制单帧工作量，避免一次同步处理数千个链接阻塞主线程

    function processNext() {
        // 路由已变化：立即中止（新页面由自己的 doneEach 触发新一轮处理）
        if (currentRouteKey() !== routeKey) return;
        var end = Math.min(idx + CHUNK_SIZE, pending.length);
        for (; idx < end; idx++) {
            wrapNetdiskLink(pending[idx], isMobile);
        }
        if (idx < pending.length) {
            scheduleIdle(processNext);
        } else {
            // 全部处理完成：若本次是带 ?id= 的搜索结果定位，
            // 页面高度在分片处理中已收缩，重新滚动到目标标题恢复正确位置
            reseekRouteAnchor();
        }
    }

    scheduleIdle(processNext);
}

// 8.5 搜索结果悬停预取：鼠标/触摸悬停到搜索结果时，提前把目标页面的 markdown
// 拉进浏览器 HTTP 缓存，点击跳转时 docsify 的 fetch 可直接命中缓存，减少等待。
// 对 pc.md（476KB）这类大页面收益明显。
var __prefetchedPaths = new Set();

function initSearchPrefetch() {
    if (window.__searchPrefetchBound) return;
    window.__searchPrefetchBound = true;

    function maybePrefetch(target) {
        var link = target && target.closest
            ? target.closest('.search .results-panel a[href^="#/"], .mobile-search-results-list a[href^="#/"]')
            : null;
        if (!link) return;
        var path = (link.getAttribute('href') || '').replace(/^#/, '').split('?')[0];
        if (!path || path === '/') return;
        var cur = (location.hash || '#/').split('?')[0].replace(/^#/, '');
        if (path === cur) return; // 已是当前页，无需预取
        if (__prefetchedPaths.has(path)) return;
        if (__prefetchedPaths.size >= 20) return; // 限制预取数量，避免浪费带宽
        __prefetchedPaths.add(path);
        try {
            // 与 docsify 加载 md 的 URL 保持一致（相对站点根路径）
            fetch(path.replace(/^\//, '') + '.md', { credentials: 'same-origin' }).catch(function () {});
        } catch (e) { /* 静默失败，不影响页面 */ }
    }

    document.addEventListener('pointerover', function (e) { maybePrefetch(e.target); }, true);
    document.addEventListener('focusin', function (e) { maybePrefetch(e.target); }, true);
}
