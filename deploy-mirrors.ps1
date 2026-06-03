# EACO AI Gateway - Multi-platform Deploy (PowerShell)
# Usage: .\deploy-mirrors.ps1
#
# Prerequisites:
#   1. Set environment variables:
#      $env:GITLAB_TOKEN = "your-gitlab-token"
#      $env:GITEE_TOKEN = "your-gitee-token"

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoDir

Write-Host ""
Write-Host "EACO AI Gateway - Multi-platform Deploy" -ForegroundColor Green
Write-Host "============================================"

# --- GitHub (primary) ---
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
$remotes = git remote
if ($remotes -notcontains "github") {
    git remote add github https://github.com/ucoingroup/eaco-ai-gateway.git
}
git push github main
Write-Host "GitHub: https://github.com/ucoingroup/eaco-ai-gateway" -ForegroundColor Green

# --- GitLab ---
Write-Host ""
if ($env:GITLAB_TOKEN) {
    Write-Host "Pushing to GitLab..." -ForegroundColor Cyan
    $gitlabRepo = "https://oauth2:$($env:GITLAB_TOKEN)@gitlab.com/ucoingroup/eaco-ai-gateway.git"
    if ($remotes -notcontains "gitlab") {
        git remote add gitlab $gitlabRepo
    } else {
        git remote set-url gitlab $gitlabRepo
    }
    try { git push gitlab main 2>&1 | Out-Null } catch {
        Write-Host "GitLab repo not found. Create it first at https://gitlab.com/projects/new" -ForegroundColor Yellow
    }
    Write-Host "GitLab: https://gitlab.com/ucoingroup/eaco-ai-gateway" -ForegroundColor Green
} else {
    Write-Host "GITLAB_TOKEN not set. Skipping GitLab." -ForegroundColor Yellow
}

# --- Gitee ---
Write-Host ""
if ($env:GITEE_TOKEN) {
    Write-Host "Pushing to Gitee..." -ForegroundColor Cyan
    $giteeRepo = "https://oauth2:$($env:GITEE_TOKEN)@gitee.com/ucoingroup/eaco-ai-gateway.git"
    if ($remotes -notcontains "gitee") {
        git remote add gitee $giteeRepo
    } else {
        git remote set-url gitee $giteeRepo
    }
    try { git push gitee main 2>&1 | Out-Null } catch {
        Write-Host "Gitee repo not found. Create it first at https://gitee.com/projects/create" -ForegroundColor Yellow
    }
    Write-Host "Gitee: https://gitee.com/ucoingroup/eaco-ai-gateway" -ForegroundColor Green
} else {
    Write-Host "GITEE_TOKEN not set. Skipping Gitee." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Deploy complete!" -ForegroundColor Green
