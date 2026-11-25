# OSX-ITSM Notification Standard

## Technology

- SweetAlert2 v11.26.25
- Centralized Notification Service
- React Custom Hook

## Source Files

- `src/utils/notifications.js`
- `src/utils/notifications.css`
- `src/hooks/useNotificationState.js`

## Development Rules

1. All new application notifications must use the centralized notification service.
2. Do not introduce new native `window.alert()`, `window.confirm()` or `window.prompt()` calls.
3. Do not import SweetAlert2 directly into application pages.
4. Use success toast for completed operations.
5. Use error dialogs for operation failures.
6. Use warning dialogs for important validation issues.
7. Use confirmation dialogs before operations that require user approval.
8. Always await confirmation results before executing the corresponding API request.
9. Display untrusted API messages as plain text, not HTML.
10. Preserve existing business logic and authorization rules.

## Available Methods

- `notifications.success(message)`
- `notifications.error(message)`
- `notifications.warning(message)`
- `notifications.info(message)`
- `await notifications.confirm(message)`

## Verification

Run npm install, npm run lint and npm run build. Verify confirmation cancellation, API errors, concurrent notifications, form validation and modal stacking before deployment.