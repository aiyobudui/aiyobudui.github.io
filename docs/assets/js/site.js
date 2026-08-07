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

function initSearchObserver() {
    var searchInput = document.querySelector('.search input[type="search"]');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            setTimeout(addCategoryToSearchResults, 300);
        });
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

if (typeof Docsify !== 'undefined' && Docsify.hooks) {
    Docsify.hooks.doneEach(function () {
        setTimeout(addCategoryToSearchResults, 500);
    });
}


// 4. 手机端底部导航栏交互
document.addEventListener('DOMContentLoaded', function () {
    var mobileNavMore = document.getElementById('mobileNavMore');
    var mobileNavPopup = document.getElementById('mobileNavPopup');
    var mobileNavSearch = document.getElementById('mobileNavSearch');
    var mobileSearchInput = document.getElementById('mobileSearchInput');
    var mobileSearchBtn = document.getElementById('mobileSearchBtn');
    var submenuItems = document.querySelectorAll('.mobile-nav-has-submenu');

    function closeAllMenus(exclude) {
        document.querySelectorAll('.mobile-nav-submenu, .mobile-nav-more-popup, .mobile-nav-search-popup').forEach(function (menu) {
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
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
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
                return false;
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
        var currentPath = window.location.pathname;
        var navItems = document.querySelectorAll('.mobile-nav-item[data-path]');

        navItems.forEach(function (item) {
            var itemPath = item.getAttribute('data-path');
            if (currentPath === itemPath || currentPath.startsWith(itemPath + '/')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateActiveNav();

    window.addEventListener('popstate', updateActiveNav);
    window.addEventListener('hashchange', updateActiveNav);

    if (typeof Docsify !== 'undefined' && Docsify.hooks) {
        Docsify.hooks.doneEach(function () {
            updateActiveNav();
        });
    }
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
