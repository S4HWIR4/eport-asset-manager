# Git Configuration Guide

## ✅ Current Configuration (Verified)

Your Git credentials are properly configured and working:

- **Email**: `dev.sahwira@gmail.com`
- **Name**: `S4HW1R4`
- **Status**: ✅ Verified and working

## Change Git User (If Needed)

To change the Git user configuration for this repository, run these commands:

```bash
# Set your GitHub email
git config user.email "your-email@example.com"

# Set your GitHub username
git config user.name "Your Name"
```

## Verify Configuration

```bash
# Check local repository configuration
git config --list --local

# View recent commits with author info
git log -1 --pretty=format:"Author: %an <%ae>"
```

## Connect to GitHub

1. Create a new repository on GitHub
2. Add the remote:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/asset-manager.git
   ```
3. Push your code:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Update Git User Globally (Optional)

If you want to set your Git configuration globally for all repositories:

```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```
