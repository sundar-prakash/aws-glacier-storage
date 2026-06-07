# Glacier Drive 📁❄️

**Glacier Drive** is a personal, open-source cloud storage manager designed to store terabytes of archives, backups, and media files on **AWS S3 Glacier** and **Glacier Deep Archive** virtually for **free**.

It mirrors the clean, responsive visual aesthetic and color palette of Google Drive (Material Design 3) and adds an interactive **AWS Cost Optimizer & Blueprint** to help you achieve zero-cost long-term cloud storage.

---

## 🌟 Key Features

- **Google Drive Aesthetics**: Styled with the exact hex colors, side navigation pill selectors, rounded file workspace container panels, and floating action button elements of Google Drive.
- **Glacier Lifecycle Support**: Directly manage Frozen (Archived), Thawing (Restoring), and Active (Restored) S3 Glacier file states.
- **Zero-Cost Blueprints**: Built-in pricing optimizer estimating AWS storage costs and highlighting how to leverage **Bulk Retrievals** ($0.00 AWS fees) and S3 Standard free allowances.
- **Direct S3 Uploading**: Files bypass the Next.js server entirely, uploading directly from the browser to S3 via presigned PUT URLs, preventing server memory leaks or timeout errors on large file transfers.
- **Virtual Folder Trees**: Directories are nested virtually inside S3 metadata, allowing instant renames, moves, and folder creations with **zero** S3 API operation fees.

---

## ⚙️ Configuration & Environment Variables

Create a `.env.local` file in the root directory (based on `.env.local.example`) and configure the following variables:

```bash
# AWS S3 Access Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-south-1 # e.g. Mumbai, us-east-1, etc.
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# Admin Portal Authentication
ADMIN_USER=admin
ADMIN_PASS=admin123 # Replace with a strong password

# Session Security
JWT_SECRET=use-a-strong-jwt-signing-secret-key-32-chars-long
```

---

## 🚀 Getting Started

### Option 1: Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

3. **Build & Run Production**:
   ```bash
   npm run build
   npm run start
   ```

### Option 2: Docker Containers (Recommended)

1. Make sure Docker and Docker Compose are installed.
2. Build and start the container:
   ```bash
   docker-compose up --build -d
   ```
3. The app is exposed on port `3000` at `http://localhost:3000`.

---

## 🧪 Testing

We use **Vitest** for running fast unit tests on our S3 parsers and stress-simulations on large file formatting limits.

Run the test suite:
```bash
npm run test
```

---

## 🔒 Security & Open-Source Guidelines

To make this project safe for open-source contribution:
1. **Secret Isolation**: Never commit `.env.local` or environment keys. They are explicitly excluded in `.gitignore`.
2. **Direct Browser Uploader**: Large archive files do not pass through the web server. S3 returns short-lived presigned upload URLs, ensuring credentials are never exposed to clients, and file buffers do not leak on the hosting server.
