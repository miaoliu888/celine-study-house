# Siven 蓝兔学习屋 V1.0 — 信息架构 & 数据模型

> 适配：手机 390×844、平板 820×1180
> 技术：纯静态 HTML/CSS/JS，IndexedDB 持久化，Web Speech API 发音

---

## 1. 信息架构

```
蓝兔学习屋
├── 🏠 桌面（首页）       — 问候 / 心情 / 进度 / 下一步
├── ✓ 今日计划            — 语数英分科任务清单
├── 🔤 KET英语            — 4 个子入口
│   ├── 今日听写（20 词 + 错词复习）
│   ├── 错词本
│   ├── 我的词库
│   └── 学习统计
├── ⏰ 专注               — 20+5 番茄钟，可与任务绑定
├── 📊 每日总结           — 完成率 / 学科 / 心情 / 文字记录
├── 📏 成长               — 身高折线
├── 🐰 小金库             — 余额 / 月度 / 兑换记录
└── ⚙ 设置                — 任务/奖励/发音/音效
```

### 1.1 导航规则
- 始终保留左侧导航（手机 ~70px、平板 ~170px）。
- 不使用底部 Tab、不折叠成汉堡菜单。
- 当前栏目：浅蓝圆角高亮。
- 设置固定在左下角。

### 1.2 页面清单（V1.0）
1. 桌面 / `desktop`
2. 今日计划 / `plan`
3. KET英语首页 / `english`
4. 每日听写 / `dictation`
5. 错词本 / `wrong-words`
6. 我的词库 / `vocab`
7. 英语学习统计 / `english-stats`
8. 专注（番茄钟） / `focus`
9. 今日总结 / `summary`
10. 学习日历 / `calendar`
11. 成长 / `growth`
12. 小金库 / `money`
13. 设置 / `settings`

---

## 2. 响应式断点

| 设备 | 宽度区间 | 导航宽度 | 内容布局 |
|------|---------|---------|---------|
| 手机 | < 600px | 70px | 单列 |
| 小平板 | 600–900px | 150px | 1–2 列（按页面） |
| 大平板 | 900–1200px | 175px | 桌面/统计/总结可双列 |
| 桌面 | > 1200px | 180px | 居中限宽 1080px |

> 不允许横向滚动。任务名必须完整显示，按钮 ≥ 44px。

---

## 3. 数据模型（IndexedDB Schema）

DB: `siven_study_house`，version 1。

### 3.1 `ket_vocabulary`（KET 词库）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| word | string | 单词本体 |
| pos | string | 词性（n./v./adj.） |
| meaning_zh | string | 中文释义 |
| topic | string | 主题（Education / Food…） |
| difficulty | 1–3 | 1=基础 2=普通 3=难拼写 |
| example_en | string | 极简例句（可选） |

### 3.2 `word_progress`（单词学习进度）
| 字段 | 类型 | 说明 |
|------|------|------|
| word_id | number | 关联 ket_vocabulary.id（主键） |
| first_seen_date | string | 首次作为"新词"出现的日期 |
| last_seen_date | string | 最近一次听写日期 |
| correct_count | number | 累计正确次数 |
| wrong_count | number | 累计错误次数 |
| consecutive_correct | number | 连续答对次数 |
| mastery | 0/1/2 | 0=新词 1=基本掌握 2=已掌握 |

### 3.3 `daily_vocabulary_schedule`（每日 20 词）
| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | YYYY-MM-DD（主键） |
| new_word_ids | number[] | 当天 20 个新词 id |
| review_word_ids | number[] | 当天要复习的错词 id |
| started_at | number | 时间戳 |
| completed_at | number | 完成时间戳 |
| new_score | {correct, wrong} | 新词成绩 |
| review_score | {correct, wrong} | 复习成绩 |

> 当天刷新必须读到同一份。**只有进入听写页时才生成**当天 schedule，避免跨天数据漂移。

### 3.4 `dictation_attempt`（每次听写记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| date | string | YYYY-MM-DD |
| word_id | number | 词 id |
| typed_answer | string | 用户输入 |
| correct_answer | string | 正确单词 |
| is_correct | boolean | |
| mode | "new" \| "review" | 新词/复习 |
| attempt_index | number | 当天第几个 |

### 3.5 `wrong_word`（错词本）
| 字段 | 类型 | 说明 |
|------|------|------|
| word_id | number | 主键 |
| first_wrong_date | string | |
| last_wrong_date | string | |
| wrong_count | number | |
| last_user_answer | string | 最近一次错误答案 |
| next_review_date | string | 下次复习日 |
| mastery | 0/1/2 | |
| consecutive_correct | number | 复习时连续对 |

### 3.6 `task_config`（任务配置）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键（slp1, eng_ket, …） |
| subject | "chinese"\|"english"\|"math" | |
| title | string | |
| target | number | 每日目标次数 |
| unit | string | "次" / "页" / "课" / "词" |
| enabled | boolean | |
| required | boolean | 是否影响金币 |
| order | number | 排序 |
| timer_enabled | boolean | 是否支持番茄钟 |
| split | "none"\|"morning_evening" | 晨读/睡前读 |
| note | string | 备注 |

### 3.7 `task_log`（每日任务完成记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | `${date}_${task_id}_${slot}` | 主键 |
| date | string | |
| task_id | string | |
| slot | "am"\|"pm"\|"single" | 晨读/睡前/单次 |
| progress | number | 当前进度（0..target） |
| completed | boolean | |
| focus_minutes | number | 累计专注分钟 |

### 3.8 `focus_session`（专注记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| date | string | |
| task_id | string \| null | 关联任务 |
| started_at | number | |
| duration_sec | number | |
| completed | boolean | 是否坚持到底 |

### 3.9 `daily_record`（每日总览）
| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 主键 |
| mood | 1..5 | 心情 |
| mood_note | string | |
| summary_text | string | 今日记录 |
| total_required | number | 必做任务总数 |
| total_completed | number | 完成数 |
| reward_earned | boolean | 是否已领 ¥1 |
| focus_minutes | number | |
| new_words | number | |
| review_words | number | |
| new_correct_rate | number | 0..1 |

### 3.10 `coin_ledger`（金币流水）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| date | string | |
| type | "earn"\|"spend" | |
| amount | number | |
| reason | string | "今日全部完成" / "买书"… |
| item | string | 兑换物品（spend 时） |

### 3.11 `growth`（身高）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | 主键 |
| date | string | |
| height_cm | number | |
| note | string | |

### 3.12 `settings`
| 字段 | 类型 | 说明 |
|------|------|------|
| key | string | 主键 |
| value | any | |

涵盖：昵称、头像、每日奖励金额、专注时长、休息时长、发音（en-GB/en-US）、音效开关、名言显示开关、当前心情语、错词上限等。

### 3.13 `quote_cache`（每日名言）
| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 主键 |
| text_zh | string | |
| text_en | string | |
| author | string | |
| source | string | |

---

## 4. KET 词库导入方案

- 一次性导入 ~500 词 A2 Key 核心词。
- 来源：Cambridge A2 Key Vocabulary List（公开题库）。
- 字段最小化：word / pos / meaning_zh / topic / difficulty。
- 例句只对部分词加一句极简 `example_en`。
- 导入时机：首次启动检测词库 < 100 词时自动初始化。

---

## 5. 每日 20 词调度算法

**触发**：进入"今日听写"页面 → 若当天 `daily_vocabulary_schedule` 不存在 → 生成。

**步骤**：

1. 取所有 `word_progress` 不存在（即从未作为"新词"出现）且 `ket_vocabulary` 启用的词 → 候选池 A。
2. 若 A < 20：从已学过但 `mastery < 2` 的词补足（不重复今天已经学过的）→ 候选池 B。
3. **主题均衡**：按主题分组，每个主题最多取 4 个（避免一天都是食物）。
4. **难度配比**：8 基础（difficulty=1）+ 8 普通（difficulty=2）+ 4 难拼写（difficulty=3）。不足时按可用量比例缩放。
5. 取 20 个 → 写 `daily_vocabulary_schedule.new_word_ids`。
6. 同步为这 20 个 word 写 `word_progress`（first_seen_date = today，mastery=0）。

**当天刷新不变**：每次进入先按 `date` 读 schedule，若已存在直接复用，不重新生成。

---

## 6. 错词复习算法

**每日 schedule 生成时**：

- 读所有 `wrong_word.next_review_date <= today` 的词 → 复习候选。
- 上限 `MAX_REVIEW_PER_DAY = 30`（避免堆积造成当天任务过重）。
- 按 `last_wrong_date` 升序排（先错先复习），写 `daily_vocabulary_schedule.review_word_ids`。

**判分逻辑**：

- `is_correct = (trim(toLowerCase(typedAnswer)) === toLowerCase(correctAnswer))`，空格忽略、大小写忽略。
- 错 → `wrong_count++`，`last_user_answer` 更新，`consecutive_correct = 0`。
- 对 → `consecutive_correct++`。
  - 连续 3 次对 → `mastery = 1`。
  - 连续 4 次及以上对 → `mastery = 2`。
  - 每次对 → 按 `next = today + interval(consecutive_correct)` 推下次。
  - 已 `mastery = 2` 的词保持。

**下次复习间隔**：

| 连续答对次数 | next_review |
|--------------|-------------|
| 0（刚错） | today + 1d |
| 1 | today + 3d |
| 2 | today + 7d |
| 3+ | today + 15d |
| mastery=2 | 不再排 |

**再错**：清零 `consecutive_correct`，`mastery` 降一级（最小 0），interval 回到 today+1d。

**关键不变量**：
> 复习不占用新词名额。20 个新词 / 天独立推进；错词再多也只延长复习页，不卡任务。

---

## 7. 任务 → 专注绑定

- 每个任务可点 `[开始 20 分钟]` → 进入 `/focus?task=xxx`。
- 专注页记录 `focus_session.task_id`。
- 完成后回到任务页，焦点 +1 进度；专注未坚持到底不计入。

---

## 8. 金币规则

- 当日所有 `required=true` 的任务 `completed=true` → 自动写一条 `coin_ledger.earn +1`。
- 一天最多一次（`daily_record.reward_earned` 标志防重）。
- 兑换只写 `coin_ledger.spend`，不接真实支付。

---

## 9. 验收自检（开发完成后逐条勾）

- [ ] 当天 schedule 刷新不变。
- [ ] 新词不与历史新词重复。
- [ ] 当天 20 词内部不重复。
- [ ] 错词不占 20 个新词名额。
- [ ] 英式发音优先 + 慢速可用。
- [ ] 拼写判断忽略空格和大小写。
- [ ] 错误自动入错词本且保存错误答案。
- [ ] 第二天出现错词复习。
- [ ] 连续 3 次对 → 基本掌握。
- [ ] 连续 4 次及以上对 → 已掌握。
- [ ] 全部必做任务完成 → +¥1。
- [ ] 数据持久化（刷新不丢）。
- [ ] 390×844 / 820×1180 下无横向滚动。
- [ ] 左侧导航始终显示。
