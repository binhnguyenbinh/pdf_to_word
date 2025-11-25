#!/bin/bash

PROJECT_ID="pdftoword-2025"

echo "Setting up Google APIs for project: $PROJECT_ID"

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling Google Docs API..."
gcloud services enable docs.googleapis.com

echo "Enabling Google Drive API..."
gcloud services enable drive.googleapis.com

echo "Enabling Google Identity Toolkit API..."
gcloud services enable identitytoolkit.googleapis.com

echo "APIs enabled successfully!"

# Create OAuth consent screen (manual step required)
echo ""
echo "Next steps:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo "2. Configure OAuth consent screen (External)"
echo "3. Add scopes: docs, drive.file"
echo "4. Create OAuth 2.0 Client ID:"
echo "   - Application type: Web application"
echo "   - Authorized JavaScript origins: https://pdftoword-2025.web.app"
echo "   - Authorized redirect URIs: https://pdftoword-2025.web.app"
echo "5. Create API Key (restrict to Docs API and Drive API)"
echo "6. Copy credentials to .env.local"
