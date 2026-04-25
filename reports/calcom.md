# drykit report — cal.com
> Generated: 2026-04-25 | drykit v0.0.0

## Summary
- **Components:** 142 registered
- **Duplicates:** 24 pairs detected
- **Secrets:** 0
- **Unregistered:** 0 files
- **Inconsistent usage:** 32 component(s) with 3+ unique prop signatures
- **Estimated tokens saved:** ~16.8k (estimate)

## Top Issues

### Duplicates
| File | Detail | Suggestion |
|---|---|---|
| SuccessToast | SuccessToast ↔ ProgressToast (distance: 5) | Consider merging into one component with variants |
| TableNew | TableNew ↔ TableNewExampleComponent (distance: 16) | Consider merging into one component with variants |
| TableNew | TableNew ↔ Table (distance: 3) | Consider merging into one component with variants |
| TableNewExampleComponent | TableNewExampleComponent ↔ Table (distance: 19) | Consider merging into one component with variants |
| Table | Table ↔ table.test (distance: 5) | Consider merging into one component with variants |
| Table | Table ↔ EditableHeading (distance: 10) | Consider merging into one component with variants |
| Table | Table ↔ EditablePlugin (distance: 9) | Consider merging into one component with variants |
| Table | Table ↔ EditablePlugin.test (distance: 14) | Consider merging into one component with variants |
| EditableHeading | EditableHeading ↔ EditablePlugin (distance: 5) | Consider merging into one component with variants |
| Dialog | Dialog ↔ dialog.test (distance: 5) | Consider merging into one component with variants |
| Dialog | Dialog ↔ ConfirmationDialogContent (distance: 19) | Consider merging into one component with variants |
| StepCard | StepCard ↔ Card (distance: 4) | Consider merging into one component with variants |
| PanelCard | PanelCard ↔ Card (distance: 5) | Consider merging into one component with variants |
| FormCard | FormCard ↔ Card (distance: 4) | Consider merging into one component with variants |
| FormCard | FormCard ↔ Form (distance: 4) | Consider merging into one component with variants |
| Card | Card ↔ card.test (distance: 5) | Consider merging into one component with variants |
| Card | Card ↔ AppListCard (distance: 7) | Consider merging into one component with variants |
| AddressInputLazy | AddressInputLazy ↔ AddressInput (distance: 4) | Consider merging into one component with variants |
| WizardForm | WizardForm ↔ wizardForm.test (distance: 5) | Consider merging into one component with variants |
| WizardForm | WizardForm ↔ Form (distance: 6) | Consider merging into one component with variants |
| wizardForm.test | wizardForm.test ↔ Form (distance: 11) | Consider merging into one component with variants |
| inputStyles | inputStyles ↔ input.test (distance: 4) | Consider merging into one component with variants |
| EditablePlugin | EditablePlugin ↔ EditablePlugin.test (distance: 5) | Consider merging into one component with variants |
| AddVariablesDropdown | AddVariablesDropdown ↔ AddVariablesDropdown.test (distance: 5) | Consider merging into one component with variants |

### Inconsistent Usage
| Component | Usages | Unique Signatures | Top Pattern |
|---|---|---|---|
| TopBanner | 9 | 7 | text,variant (2x) |
| Tooltip | 75 | 12 | content (46x) |
| Skeleton | 64 | 13 | className (39x) |
| Section | 20 | 3 | title (18x) |
| OrgBanner | 3 | 3 | alt,imageSrc,testid (1x) |
| Logo | 6 | 3 | className (3x) |
| ShellSubHeading | 6 | 6 | subtitle,title (1x) |
| ImageUploader | 6 | 4 | buttonMsg,handleAvatarChange,id,target (3x) |
| Icon | 125 | 26 | className,name (67x) |
| EmptyScreen | 36 | 20 | Icon,description,headline (7x) |
| Editor | 15 | 8 | getText (5x) |
| Dialog | 89 | 8 | onOpenChange,open (66x) |
| ConfirmationDialogContent | 20 | 10 | confirmBtnText,onConfirm,title,variety (6x) |
| Card | 7 | 5 | description,structure,title,variant (3x) |
| UserAvatar | 6 | 4 | testid,user (2x) |
| Avatar | 49 | 9 | alt,imageSrc,size (21x) |
| AppListCard | 3 | 3 | actions,className,classNameObject,description,key,logo,slug,title (1x) |
| Label | 84 | 6 | className (45x) |
| VerticalTabs | 5 | 4 | className,iconClassName,itemClassname,tabs (2x) |
| VerticalTabItem | 3 | 3 | className,iconClassName,key,linkScroll,linkShallow (1x) |
| HorizontalTabs | 9 | 3 | tabs (7x) |
| ToggleGroup | 12 | 8 | onValueChange,value (5x) |
| Switch | 53 | 29 | checked,id,onCheckedChange,size (8x) |
| SettingsToggle | 49 | 31 | Badge,checked,disabled,labelClassName,onCheckedChange,title (6x) |
| Steps | 7 | 4 |  (3x) |
| Label | 84 | 6 | className (45x) |
| PasswordField | 14 | 9 | label (3x) |
| Form | 50 | 6 | form,handleSubmit (36x) |
| DatePicker | 22 | 16 | browsingDate,isCompact,locale,onChange,periodData,slots (3x) |
| Calendar | 8 | 7 |  (2x) |
| Checkbox | 12 | 5 | checked,onCheckedChange (8x) |
| ToolbarPlugin | 14 | 8 |  (6x) |
