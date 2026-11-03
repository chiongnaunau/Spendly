# Release checklist (Web & API)

- [ ] Replace development API-key authentication with verified per-user OAuth/JWT authentication (e.g. Firebase, Supabase, Auth0).
- [ ] Add user sign-up, sign-in, session management, and account deletion workflows.
- [ ] Deploy API and PostgreSQL with automated backups, TLS (HTTPS), secrets management, migrations, and logging.
- [ ] Configure Qdrant vector database with persistent volumes and monitoring.
- [ ] Validate upload limits, receipt image MIME types, rate limiting, and CORS origins.
- [ ] Deploy Next.js web application with CDN caching, SEO metadata, and SSL certificates.
- [ ] Publish a privacy policy covering receipt image processing and data safety.
- [ ] Verify LangGraph agent fallbacks, Gemini API quotas, and error monitoring (e.g. Sentry).
