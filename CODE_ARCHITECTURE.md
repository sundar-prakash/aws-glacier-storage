# Glacier Drive Architecture Document 🏗️

This document outlines the codebase layout, data flow, indexing engine, and core design principles of **Glacier Drive**.

---

## 📁 Repository Structure

```
├── Dockerfile                   # Multi-stage production container setup
├── docker-compose.yml           # Local dev orchestrator mounting environment variables
├── package.json                 # Project scripts and dependency tree
├── vitest.config.ts             # Vitest framework config for TS and path mapping
├── src
│   ├── middleware.ts            # Entrypoint Next.js request auth router
│   ├── proxy.ts                 # Session and page-redirect gatekeeper logic
│   ├── lib
│   │   ├── auth.ts              # JWT signing, verification, and cookie storage helpers
│   │   ├── s3.ts                # S3 commands, presigned URLs, and status synchronizers
│   │   └── __tests__
│   │       └── s3.test.ts       # Test suite for parser functions & petabyte formatting stress simulation
│   └── app
│       ├── layout.tsx           # Base page wrapper and global styles loader
│       ├── globals.css          # Color theme variables (Google Drive MD3 palette)
│       ├── page.tsx             # Interactive dashboard (files list, upload UI, Optimizer)
│       ├── login
│       │   └── page.tsx         # User authentication gate UI
│       └── api
│           ├── auth
│           │   ├── login        # Endpoint handling session setup & credentials checks
│           │   └── logout       # Endpoint destroying JWT cookie sessions
│           └── files            # Directory index and S3 operations endpoints
│               ├── route.ts     # GET (metadata fetch) & POST (create metadata / presigned url)
│               └── [id]
│                   ├── route.ts # DELETE files or virtual directories
│                   ├── download # GET download presigned URLs
│                   ├── restore  # POST restore requests for Glacier tapes
│                   ├── sync     # GET check S3 ongoing-restore headers
│                   └── preview  # GET preview image metadata handler
```

---

## 🗂️ Virtual Directory Management

AWS S3 is a flat object storage system, not a filesystem. Rather than renaming keys or copying objects inside S3 prefix paths (which consumes request fees), Glacier Drive implements **virtual directory nesting**:

1. **Metadata Index**: All file and directory relations are saved in a single centralized S3 object: `metadata.json` (stored in the cheap S3 Standard tier).
2. **Directory Records**: Folders are stored as records with `isFolder: true` and an optional `parentId`.
3. **Traversal**: When a folder is deleted, Glacier Drive recursively parses the index tree, finds all descendant files and folders, issues bulk delete requests for their respective S3 binaries (`files/${id}` and previews `previews/${id}.webp`), and commits the updated index.
4. **Efficiency**: Creating, renaming, or moving folders changes only the local memory properties of `metadata.json` and updates it in one Standard S3 write operation, incurring **$0.00** S3 prefix modification costs.

---

## 💰 AWS Glacier Cost Math & Blueprint

Glacier Drive is specifically designed to fit within the AWS Free Tier. The calculations inside the Cost Optimizer reflect Mumbai (`ap-south-1`) region rates:

### 1. Storage
- **S3 Standard**: $0.023 per GB/month (used for metadata indexing and previews). First 5 GB is free.
- **S3 Glacier Flexible**: $0.0036 per GB/month.
- **S3 Glacier Deep Archive**: $0.00099 per GB/month (the absolute lowest cost for cold backups).

### 2. Retrieval Speeds (Free Tiers)
- **Bulk Retrieval**: Free. Delivers restored objects in **5–12 hours**. Ideal for standard personal archive restores.
- **Standard Retrieval**: Free up to **10 GB per month** (AWS Free Tier allocation), then billed at $0.01 per GB. Delivers restored objects in **3–5 hours**.
- **Expedited Retrieval**: Billed at $0.03 per GB + request fees. Delivers in **1–5 minutes**. Used only for critical emergency access.

---

## 🔒 Authentication Flow

1. **Credentials Validation**: Username and password checks match parameters defined in `.env.local` (`ADMIN_USER`, `ADMIN_PASS`).
2. **Session Cookies**: Upon login, a JWT is signed with the `JWT_SECRET` key using the high-performance `jose` library. It is saved in an `httpOnly`, secure, `SameSite=Lax` cookie.
3. **Next.js Middleware**: Every page request passes through `src/middleware.ts` which decodes the JWT. If invalid or missing, request parameters are proxied and redirected to `/login`.
