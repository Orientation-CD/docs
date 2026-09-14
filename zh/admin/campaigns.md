# 营销活动

营销活动页面位于 `GET /admin/campaigns`（模板 `app/templates/admin/campaigns.html`），配置产品在获客里程碑时发放的免费积分。它刻意保持简单——每个营销活动只有一个可配置数字：积分数量。

## 什么是营销活动

**营销活动**是一个命名代码，在特定用户事件发生时发放固定数量的积分。当前产品中接入的示例：

| 营销活动代码 | 事件 | 最小金额 |
| --- | --- | --- |
| `NEW_USER_REGISTRATION` | 新用户注册。 | 0 |
| 邀请营销活动代码（来自配置） | 获得邀请奖励。 | 1 |

营销活动代码枚举于 `CampaignCode`（`app/db_models.py`）。页面为每个已知营销活动渲染一张卡片。

## 编辑营销活动

每张卡片显示营销活动名称、描述、当前生效的积分数量，以及一个内联表单用于修改。通过 `POST /admin/campaigns/{code}` 提交。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Token amount | number | 是 | 每个事件发放的积分数。范围 0 … **1,000,000,000**（`app/campaign_configuration.py` 中的 `MAX_CAMPAIGN_TOKEN_AMOUNT` 上限）。 | 当前值 |
| Expected version | hidden | 是 | 用于检测并发编辑的乐观锁版本。 | 当前值 |

### 保存原理

保存使用 `save_campaign_token_amount(...)`：
- 它对 `campaign-configuration:<code>` 加 Postgres 咨询锁，防止两个管理员交错写入。
- 它将提交的 `expected_version` 与存储的版本比较。如果另一个管理员在期间保存了，你会收到 `409 CAMPAIGN_CONFIGURATION_CHANGED`，必须刷新。
- 成功后版本号递增，并将执行操作的管理员记录为 `updated_by_user_id`。

### 数据库与环境变量回退

如果数据库中尚不存在行（启动/迁移间隙），生效金额回退到该营销活动的环境配置默认值（`effective_campaign_token_amount(..., fallback=...)`）。一旦你在此页面保存，数据库值将永久生效。

## 效果

- 新注册用户立即获得配置数量的免费积分。
- 邀请奖励在邀请事件触发时入账配置金额。
- 由于值在事件发生时读取，**修改它只影响未来的事件**——不会追溯调整已发放的余额。

## 提示

- 谨慎设置注册发放额：这是你的首次使用成本。太高会膨胀免费使用量；太低会阻碍用户尝试产品。
- 保持邀请金额 ≥ 1 且小于注册发放额，除非你特别希望奖励邀请超过注册。
