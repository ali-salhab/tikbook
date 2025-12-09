# TikBook Quick Start Script
# This script helps you start the backend and mobile app quickly

Write-Host "🚀 TikBook Quick Start" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# Function to check if a command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

$allGood = $true

if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    $allGood = $false
}

if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    $allGood = $false
}

if (Test-Command "mongod") {
    Write-Host "✅ MongoDB installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB not found in PATH (might still be installed)" -ForegroundColor Yellow
}

if (Test-Command "expo") {
    Write-Host "✅ Expo CLI installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Expo CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g expo-cli
}

Write-Host ""

if (-not $allGood) {
    Write-Host "❌ Please install missing prerequisites before continuing." -ForegroundColor Red
    Write-Host "See SETUP_GUIDE.md for installation instructions." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Show menu
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "1. 🔧 Setup (First time only)" -ForegroundColor White
Write-Host "2. 🚀 Start Backend Server" -ForegroundColor White
Write-Host "3. 📱 Start Mobile App" -ForegroundColor White
Write-Host "4. 🌐 Start Both (Backend + Mobile)" -ForegroundColor White
Write-Host "5. 🗄️  Seed Database" -ForegroundColor White
Write-Host "6. 📦 Build APK" -ForegroundColor White
Write-Host "7. ❌ Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-7)"

switch ($choice) {
    "1" {
        Write-Host "`n🔧 Running first-time setup..." -ForegroundColor Cyan
        
        Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location backend
        npm install
        
        Write-Host "`n📦 Installing mobile dependencies..." -ForegroundColor Yellow
        Set-Location ..\mobile
        npm install
        
        Write-Host "`n🗄️  Seeding database..." -ForegroundColor Yellow
        Set-Location ..\backend
        npm run seed
        
        Write-Host "`n✅ Setup complete!" -ForegroundColor Green
        Write-Host "Run this script again and choose option 4 to start the app." -ForegroundColor Cyan
    }
    
    "2" {
        Write-Host "`n🚀 Starting backend server..." -ForegroundColor Cyan
        Write-Host "Server will run on http://localhost:5000" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
        Set-Location backend
        npm run dev
    }
    
    "3" {
        Write-Host "`n📱 Starting mobile app..." -ForegroundColor Cyan
        Write-Host "Expo Dev Tools will open in your browser" -ForegroundColor Yellow
        Write-Host "Press 'a' for Android or 'i' for iOS" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
        Set-Location mobile
        npx expo start
    }
    
    "4" {
        Write-Host "`n🌐 Starting backend and mobile app..." -ForegroundColor Cyan
        Write-Host "⚠️  This will open two separate terminal windows" -ForegroundColor Yellow
        Write-Host ""
        
        # Start backend in new window
        Write-Host "Starting backend server..." -ForegroundColor Yellow
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"
        
        Start-Sleep -Seconds 3
        
        # Start mobile in new window
        Write-Host "Starting mobile app..." -ForegroundColor Yellow
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\mobile'; npx expo start"
        
        Write-Host "`n✅ Both services started in separate windows!" -ForegroundColor Green
        Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
        Write-Host "Mobile: Check the Expo window" -ForegroundColor Cyan
        Write-Host "`nPress Enter to close this window..." -ForegroundColor Yellow
        Read-Host
    }
    
    "5" {
        Write-Host "`n🗄️  Seeding database with dummy data..." -ForegroundColor Cyan
        Set-Location backend
        npm run seed
        Write-Host "`n✅ Database seeded successfully!" -ForegroundColor Green
        Write-Host "Test credentials:" -ForegroundColor Yellow
        Write-Host "Email: ahmed@tikbook.com | Password: 123456" -ForegroundColor White
        Write-Host "Email: sara@tikbook.com | Password: 123456" -ForegroundColor White
    }
    
    "6" {
        Write-Host "`n📦 Building APK..." -ForegroundColor Cyan
        Write-Host "Choose build method:" -ForegroundColor Yellow
        Write-Host "1. EAS Build (Cloud - Recommended)" -ForegroundColor White
        Write-Host "2. Local Build" -ForegroundColor White
        $buildChoice = Read-Host "Enter choice (1-2)"
        
        Set-Location mobile
        
        if ($buildChoice -eq "1") {
            Write-Host "`nStarting EAS Build..." -ForegroundColor Yellow
            
            if (-not (Test-Command "eas")) {
                Write-Host "Installing EAS CLI..." -ForegroundColor Yellow
                npm install -g eas-cli
            }
            
            Write-Host "`nYou'll need to login to Expo..." -ForegroundColor Yellow
            eas login
            
            Write-Host "`nBuilding APK..." -ForegroundColor Yellow
            eas build -p android --profile preview
            
            Write-Host "`n✅ Build started! Check your Expo dashboard for progress." -ForegroundColor Green
        } else {
            Write-Host "`nBuilding locally..." -ForegroundColor Yellow
            Write-Host "This may take 10-20 minutes..." -ForegroundColor Yellow
            
            npx expo prebuild --platform android
            Set-Location android
            .\gradlew assembleRelease
            
            Write-Host "`n✅ APK built successfully!" -ForegroundColor Green
            Write-Host "Location: mobile\android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Cyan
        }
    }
    
    "7" {
        Write-Host "`n👋 Goodbye!" -ForegroundColor Cyan
        exit
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host "`nPress Enter to exit..." -ForegroundColor Yellow
Read-Host
