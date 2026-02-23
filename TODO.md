steps to run the project

1. run the docker compose file - docker compose up
2. run the prisma generate - pnpm prisma generate
3. run the prisma db push - pnpm prisma db push
4. run the prisma seed - pnpm run db:seed
5. run the nextjs app - pnpm run dev

TODO:

Here are features you can implement later:
UI/UX Enhancements
Dark/Light mode toggle - User theme preferences, default light mode
Connection thumbnails - Live preview of active connections
Quick connect - Recent connections on dashboard
Search and filter - Find connections quickly

Mobile & Accessibility
Progressive Web App (PWA) - Install as mobile or desktop app
Touch optimization - Better mobile/tablet experience
Screen reader support - WCAG compliance
Keyboard navigation - Full keyboard accessibility
Multi-language support - i18n for global users - user will have option to select language from settings and login page - preferably hindi, english, telugu, tamil, malyalam, bengali, urdu, punjabi and kannada.

Security & Authentication

    Multi-Factor Authentication (MFA/2FA) - Add TOTP or SMS-based 2FA

    Session timeout warnings - Alert users before auto-logout

    IP whitelisting - Restrict access by IP ranges

    OAuth/SAML integration - Corporate SSO support

    Biometric authentication - Fingerprint/Face ID for mobile

User Management

    User groups and roles - Admin, Power User, Guest roles

    Permission management - Fine-grained access control per connection

    User profile page - Avatar, preferences, password change

    Activity dashboard - Personal usage statistics

    Connection favorites - Bookmark frequently used connections

Monitoring & Analytics

    Real-time usage dashboard - Live active sessions

    Usage reports - Daily/weekly/monthly reports

    Connection quality metrics - Latency, bandwidth usage

    Alert system - Email/Slack notifications for issues

    Audit trail - Comprehensive action logs with export

Connection Features

    Connection sharing - Share sessions with other users

    File transfer - Upload/download files to/from remote desktop

    Clipboard sync - Copy-paste between local and remote

    Multi-monitor support - Span across multiple displays

    Connection templates - Pre-configured connection settings

Performance & Scaling

    Load balancing - Distribute connections across multiple guacd instances

    Connection pooling - Reuse connections for better performance

    Bandwidth optimization - Adaptive quality based on connection

    Caching strategy - Cache connection metadata

    CDN integration - Serve static assets from CDN

Administration

    Admin panel - Manage users, connections, settings

    Bulk operations - Import/export connections via CSV

    Health monitoring - System status dashboard

    Backup/restore - Database backup scheduling

    License management - Track and manage licenses
