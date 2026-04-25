# drykit report — documenso
> Generated: 2026-04-25 | drykit v2.9.1

## Summary
- **Components:** 24 registered
- **Duplicates:** 2 pairs detected
- **Secrets:** 0
- **Unregistered:** 0 files
- **Inconsistent usage:** 2 component(s) with 3+ unique prop signatures
- **Estimated tokens saved:** ~1.4k (estimate)

## Top Issues

### Duplicates
| File | Detail | Suggestion |
|---|---|---|
| RecipientRoleSelect | RecipientRoleSelect ↔ RecipientActionAuthSelect (distance: 9) | Consider merging into one component with variants |
| DocumentGlobalAuthActionSelect | DocumentGlobalAuthActionSelect ↔ DocumentGlobalAuthAccessSelect (distance: 4) | Consider merging into one component with variants |

### Inconsistent Usage
| Component | Usages | Unique Signatures | Top Pattern |
|---|---|---|---|
| RecipientRoleSelect | 5 | 5 | onValueChange (1x) |
| AnimateGenericFadeInOut | 12 | 3 | key (6x) |
