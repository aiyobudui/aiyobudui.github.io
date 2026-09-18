import re, sys

out = open(r'd:\Documents\github\docsify-docs\.tmp_analyze_out.txt', 'w', encoding='utf-8')
def say(*a):
    print(*a)
    out.write(' '.join(str(x) for x in a) + '\n')

p = r'd:\Documents\github\docsify-docs\docs\zh-cn\games\pc.md'
with open(p, encoding='utf-8') as f:
    text = f.read()
lines = text.split('\n')

say('文件大小(bytes)=', len(text.encode('utf-8')))
say('总行数=', len(lines))

# 1) H4 数量
h4 = [l for l in lines if l.startswith('#### ')]
say('H4 标题数量=', len(h4))

# 2) H4 中是否含半角 markdown 特殊字符
specials = set('[](){}`*_#+.!|><~^$')
flagged = []
for l in h4:
    title = l[5:]
    hits = [c for c in title if c in specials]
    if hits:
        flagged.append((l, ''.join(sorted(set(hits)))))
say('H4 含半角特殊字符的数量=', len(flagged))
for l, h in flagged[:30]:
    say('  FLAG', repr(h), '->', l[:80])

# 3) 反引号总数（奇偶 = 是否有未闭合行内代码）
bt = text.count('`')
say('反引号总数=', bt, '(奇数=可能有未闭合行内代码)' if bt % 2 else '(偶数)')

# 4) 代码围栏 ``` 数量（奇偶 = 未闭合代码块，会导致大段被吞）
fence = len(re.findall(r'^```', text, re.M))
say('代码围栏 ``` 数量=', fence, '(奇数=有未闭合代码块!)' if fence % 2 else '(偶数)')

# 5) 裸 < > 粗略统计（可能裸 HTML）
lt = len(re.findall(r'<', text))
gt = len(re.findall(r'>', text))
say('裸 < 数量=', lt, ' 裸 > 数量=', gt)

# 6) H4 里含 < 或 > 的（裸 HTML 在标题里）
h4html = [l for l in h4 if '<' in l or '>' in l]
say('H4 含 < 或 > 的数量=', len(h4html))
for l in h4html[:20]:
    say('  H4HTML', l[:90])

# 7) 抽样看 H4 真实字符分布（前 15 + 中间 15 + 末 15）
sample = h4[:15] + h4[len(h4)//2:len(h4)//2+15] + h4[-15:]
say('--- H4 抽样 ---')
for l in sample:
    say('  ', l[:90])

out.close()
