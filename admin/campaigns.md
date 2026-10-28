# Campaign Token amounts

`/admin/campaigns` controls future new-user and referral grants without restarting the service. It is not a bulk balance editor.

| Campaign | Applies to | Allowed amount |
| --- | --- | --- |
| `NEW_USER_REGISTRATION` | A genuinely new account's one-time initial grant | Zero or positive integer |
| `REFERRAL_FIRST_PURCHASE` | The inviter's eligible first-purchase reward | Positive integer |

The UI shows whether the value comes from environment fallback or database management, along with the last save time and version. Until the first administrator save, the configured environment fallback applies. Amounts are bounded to 1,000,000,000 whole Tokens; the referral minimum is one.

Saving sends `expected_version`. A concurrent save returns `CAMPAIGN_CONFIGURATION_CHANGED`: reload, inspect the winning value and reapply the intended change. Do not overwrite a peer's edit by repeatedly resending an old form.

The new amount applies only to future qualifying events. Existing user balances, promised reward amounts, claimed rewards and immutable ledger entries do not change retroactively. Setting the registration amount to zero disables that future grant; it does not revoke a prior award.

Referral eligibility, first-wins attribution, non-refundable purchase/use conditions and explicit reward claim remain enforced independently of this amount. See [Tokens and rewards](/backend/billing-tokens) and the [REST contract](/reference/rest-api).

---

Source evidence · backend `e59716c8`: [app/admin/marketing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/marketing.py) · [app/marketing/campaign_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/marketing/campaign_configuration.py) · [app/templates/admin/campaigns.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/campaigns.html).
