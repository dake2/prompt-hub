
# 一、最终权限矩阵（更新版）

| 行为           | 游客 | 用户 | 管理员 |
| ------------ | -- | -- | --- |
| 浏览已上线 Prompt | ✅  | ✅  | ✅   |
| 上传 Prompt    | ❌  | ✅  | ✅   |
| 编辑自己 Prompt  | ❌  | ✅  | ✅   |
| 编辑他人 Prompt  | ❌  | ❌  | ✅   |
| 上/下线 Prompt  | ❌  | ✅  | ✅   |
| 删除自己 Prompt  | ❌  | ✅  | ✅   |
| 删除他人 Prompt  | ❌  | ❌  | ✅   |

---

# 二、关键点（Supabase RLS 规则）

> **UPDATE / DELETE / SELECT 都是 OR 生效**
> 所以只要加一条「管理员 update」即可

---

# 三、完整 UPDATE 策略（重点）

## 1️⃣ 作者可编辑自己的 Prompt（已有）

```sql
create policy "author update own prompt"
on prompts
for update
using (
  auth.uid() = author_id
);
```

---

## 2️⃣ 管理员可编辑任意 Prompt（新增）

```sql
create policy "admin update any prompt"
on prompts
for update
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
```

> ⚠️ **不要加 with check 限制**
> 否则管理员会被限制字段

---

# 四、最终 prompts 表 RLS 全量清单（推荐对照）

### SELECT

* public read published
* author read own

### INSERT

* author insert

### UPDATE

* author update own
* admin update any

### DELETE

* author delete own
* admin delete any

👉 **这 6 条 = 完整、无漏洞、好维护**

---

# 五、前端实现（无需区分角色）

### 编辑 Prompt（统一）

```ts
supabase
  .from('prompts')
  .update({
    title,
    description,
    content,
    published
  })
  .eq('id', promptId)
```

* 普通用户：只能改自己的
* 管理员：什么都能改
* 游客：直接失败

---
