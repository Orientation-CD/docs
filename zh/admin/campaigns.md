# 活动奖励点数

`/admin/campaigns` 无需重启即可配置未来新用户与推荐奖励，不用于批量修改现有余额。

| 活动 | 生效对象 | 金额要求 |
| --- | --- | --- |
| `NEW_USER_REGISTRATION` | 真正新账号的一次性初始赠送 | 零或正整数 |
| `REFERRAL_FIRST_PURCHASE` | 符合首次购买条件的邀请人奖励 | 正整数 |

页面展示环境 fallback 或数据库管理状态，以及最近保存时间和版本。管理员首次保存前使用部署环境 fallback。金额为整数 Tokens，上限 1,000,000,000；推荐奖励最少一个。

保存携带 `expected_version`。并发保存返回 `CAMPAIGN_CONFIGURATION_CHANGED` 时，重新加载、检查已生效值，再应用预期修改，不能反复重发旧表单覆盖他人编辑。

新值仅影响未来符合条件的事件，不追溯修改用户余额、已承诺奖励、已领取奖励或不可变账本。注册金额设为零只关闭未来赠送，不撤回历史奖励。

推荐资格、first-wins 归因、不可退款购买/使用条件及显式领取都独立执行。参见 [Tokens 与奖励](/zh/backend/billing-tokens)及 [REST 合同](/zh/reference/rest-api)。

---

代码依据 · backend `b13cc566`: [app/admin/marketing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/marketing.py) · [app/marketing/campaign_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/marketing/campaign_configuration.py) · [app/templates/admin/campaigns.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/campaigns.html).
