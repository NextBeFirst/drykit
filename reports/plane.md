# drykit report — plane
> Generated: 2026-04-25 | drykit v1.3.1

## Summary
- **Components:** 190 registered
- **Duplicates:** 42 pairs detected
- **Secrets:** 1
- **Unregistered:** 0 files
- **Inconsistent usage:** 37 component(s) with 3+ unique prop signatures
- **Estimated tokens saved:** ~30.1k (estimate)

## Top Issues

### Duplicates
| File | Detail | Suggestion |
|---|---|---|
| Table | Table ↔ Sortable (distance: 3) | Consider merging into one component with variants |
| oauth-button | oauth-button ↔ button (distance: 6) | Consider merging into one component with variants |
| ModalCore | ModalCore ↔ AlertModalCore (distance: 5) | Consider merging into one component with variants |
| useDropdownKeyDown | useDropdownKeyDown ↔ Dropdown (distance: 10) | Consider merging into one component with variants |
| input | input ↔ InputColorPicker (distance: 11) | Consider merging into one component with variants |
| input | input ↔ AuthPasswordInput (distance: 12) | Consider merging into one component with variants |
| input | input ↔ AuthInput (distance: 4) | Consider merging into one component with variants |
| input | input ↔ AuthConfirmPasswordInput (distance: 19) | Consider merging into one component with variants |
| input | input ↔ ControllerInput (distance: 10) | Consider merging into one component with variants |
| input | input ↔ PasswordInput (distance: 8) | Consider merging into one component with variants |
| input | input ↔ InputSearch (distance: 6) | Consider merging into one component with variants |
| custom-select | custom-select ↔ CustomSearchSelect (distance: 6) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ MultiSelectDropdown (distance: 11) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ BreadcrumbNavigationSearchDropdown (distance: 26) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ BreadcrumbNavigationDropdown (distance: 20) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ DropdownOptions (distance: 7) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ DropdownOptionsLoader (distance: 13) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ DropdownButton (distance: 6) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ IssueFiltersDropdown (distance: 12) | Consider merging into one component with variants |
| Dropdown | Dropdown ↔ FiltersDropdown (distance: 7) | Consider merging into one component with variants |
| card | card ↔ ConfirmDiscardModal (distance: 15) | Consider merging into one component with variants |
| card | card ↔ AuthenticationMethodCard (distance: 20) | Consider merging into one component with variants |
| card | card ↔ CommentCard (distance: 7) | Consider merging into one component with variants |
| card | card ↔ HeaderGroupByCard (distance: 13) | Consider merging into one component with variants |
| card | card ↔ HeaderSubGroupByCard (distance: 16) | Consider merging into one component with variants |
| card | card ↔ HeaderGroupByCard (distance: 13) | Consider merging into one component with variants |
| CollapsibleButton | CollapsibleButton ↔ button (distance: 11) | Consider merging into one component with variants |
| buttonStyling | buttonStyling ↔ button (distance: 7) | Consider merging into one component with variants |
| button | button ↔ DropdownButton (distance: 8) | Consider merging into one component with variants |
| button | button ↔ ButtonAvatars (distance: 7) | Consider merging into one component with variants |
| BreadcrumbNavigationSearchDropdown | BreadcrumbNavigationSearchDropdown ↔ BreadcrumbNavigationDropdown (distance: 6) | Consider merging into one component with variants |
| AuthPasswordInput | AuthPasswordInput ↔ AuthConfirmPasswordInput (distance: 7) | Consider merging into one component with variants |
| AuthPasswordInput | AuthPasswordInput ↔ PasswordInput (distance: 4) | Consider merging into one component with variants |
| AuthPasswordInput | AuthPasswordInput ↔ AuthPasswordForm (distance: 5) | Consider merging into one component with variants |
| AuthForm | AuthForm ↔ AuthEmailForm (distance: 5) | Consider merging into one component with variants |
| AuthConfirmPasswordInput | AuthConfirmPasswordInput ↔ PasswordInput (distance: 11) | Consider merging into one component with variants |
| DropdownOptions | DropdownOptions ↔ DropdownOptionsLoader (distance: 6) | Consider merging into one component with variants |
| DropdownOptions | DropdownOptions ↔ DropdownButton (distance: 4) | Consider merging into one component with variants |
| IssueFiltersDropdown | IssueFiltersDropdown ↔ FiltersDropdown (distance: 5) | Consider merging into one component with variants |
| HeaderGroupByCard | HeaderGroupByCard ↔ HeaderSubGroupByCard (distance: 3) | Consider merging into one component with variants |
| HeaderGroupByCard | HeaderGroupByCard ↔ HeaderGroupByCard (distance: 0) | Consider merging into one component with variants |
| HeaderSubGroupByCard | HeaderSubGroupByCard ↔ HeaderGroupByCard (distance: 3) | Consider merging into one component with variants |

### Secrets
| File | Line | Detail | Suggestion |
|---|---|---|---|
| apps/admin/components/instance/setup-form.tsx | 31 | Hardcoded Password detected (PASSWORD...ORD") | Move to .env.local and reference as process.env.YOUR_SECRET |

### Inconsistent Usage
| Component | Usages | Unique Signatures | Top Pattern |
|---|---|---|---|
| ScrollArea | 21 | 9 | className (6x) |
| DropIndicator | 23 | 4 | instruction,isVisible (11x) |
| Tooltip | 205 | 36 | isMobile,tooltipContent (36x) |
| Tabs | 12 | 4 | defaultValue (7x) |
| Table | 4 | 3 | className (2x) |
| Spinner | 50 | 3 | height,width (25x) |
| CircularBarSpinner | 14 | 3 | height,width (7x) |
| Popover | 31 | 8 | onOpenChange,open (13x) |
| PopoverMenu | 4 | 4 | data,keyExtractor (1x) |
| ModalCore | 53 | 7 | handleClose,isOpen,position,width (31x) |
| AlertModalCore | 16 | 3 | content,handleClose,handleSubmit,isOpen,isSubmitting,title (14x) |
| input | 98 | 39 | name,type,value (17x) |
| CustomSearchSelect | 15 | 12 | onChange,value (3x) |
| ControlLink | 12 | 6 | href,id,onClick (4x) |
| CollapsibleButton | 4 | 4 | className,indicatorElement,isOpen,issueServiceType,title (1x) |
| button | 541 | 55 | className,onClick,type (169x) |
| Avatar | 75 | 18 | name,showTooltip,size,src (19x) |
| AvatarGroup | 5 | 3 | showTooltip (2x) |
| EmptyState | 8 | 3 | description,image,primaryButton,title (5x) |
| ControllerInput | 9 | 3 | control,description,error,key,label,name,placeholder,required,type (7x) |
| BreadcrumbLink | 47 | 5 | className,icon,label (27x) |
| Banner | 6 | 3 | className,icon,variant (3x) |
| AuthHeader | 10 | 4 |  (4x) |
| RichTextEditor | 13 | 10 | containerClassName,editable,id,initialValue,projectId,workspaceId,workspaceSlug (3x) |
| LiteTextEditor | 8 | 8 | id,value,workspaceId (1x) |
| DropdownOptions | 3 | 3 | disableSearch,handleClose,inputClassName,inputContainerClassName,inputIcon,inputPlaceholder,isOpen,keyExtractor,loader,options,query,renderItem,setQuery,value (1x) |
| DropdownButton | 11 | 3 | className,isActive,renderToolTipByDefault,showTooltip,tooltipContent,tooltipHeading,variant (7x) |
| IssueLayoutIcon | 9 | 5 | className,layout (4x) |
| AuthHeader | 10 | 4 |  (4x) |
| CommentCard | 3 | 3 | activityOperations,comment,disabled,enableReplies,ends,entityId,index,index,key,projectId,showAccessSpecifier,showCopyLinkOption,workspaceSlug (1x) |
| List | 3 | 3 | className (1x) |
| ButtonAvatars | 13 | 4 | showTooltip,userIds (7x) |
| KanBan | 3 | 3 | displayProperties,getGroupIssueCount,getIssueLoader,getPaginationData,groupBy,groupedIssueIds,loadMoreIssues,scrollableContainerRef,showEmptyGroup,subGroupBy,subGroupId (1x) |
| FilterOption | 53 | 8 | isChecked,key,onClick (36x) |
| FiltersDropdown | 28 | 9 | className,icon (9x) |
| HeaderGroupByCard | 6 | 5 | count,groupBy,icon,title (2x) |
| HeaderGroupByCard | 6 | 5 | count,groupBy,icon,title (2x) |
