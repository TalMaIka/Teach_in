@echo off
echo Trying to locate Android SDK...

REM Try common Android SDK locations
set POSSIBLE_LOCATIONS=C:\Users\%USERNAME%\AppData\Local\Android\Sdk;C:\Android\Sdk;%LOCALAPPDATA%\Android\Sdk;%APPDATA%\Local\Android\Sdk;C:\Program Files\Android\Sdk;C:\Program Files (x86)\Android\Sdk

for %%G in (%POSSIBLE_LOCATIONS%) do (
    if exist "%%G\platform-tools\adb.exe" (
        echo Found Android SDK at: %%G
        set ANDROID_SDK_ROOT=%%G
        goto :found_sdk
    )
)

REM If we get here, we didn't find the SDK
echo Could not find Android SDK automatically.
echo Please enter the full path to your Android SDK:
set /p ANDROID_SDK_ROOT=Android SDK path:
if not exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
    echo Invalid SDK path: adb.exe not found in %ANDROID_SDK_ROOT%\platform-tools
    exit /b 1
)

:found_sdk
echo Using Android SDK at: %ANDROID_SDK_ROOT%

REM Add Android SDK tools to PATH
set PATH=%PATH%;%ANDROID_SDK_ROOT%\platform-tools;%ANDROID_SDK_ROOT%\tools;%ANDROID_SDK_ROOT%\tools\bin;%ANDROID_SDK_ROOT%\emulator

echo Checking ADB...
"%ANDROID_SDK_ROOT%\platform-tools\adb.exe" version
if %ERRORLEVEL% NEQ 0 (
    echo Failed to run ADB! Make sure Android SDK is installed correctly.
    exit /b 1
)

echo Checking for running emulators...
"%ANDROID_SDK_ROOT%\platform-tools\adb.exe" devices
echo.

echo Listing available AVDs...
if exist "%ANDROID_SDK_ROOT%\emulator\emulator.exe" (
    "%ANDROID_SDK_ROOT%\emulator\emulator.exe" -list-avds
    echo.

    echo Please verify that the AVD name in .detoxrc.js matches one of these names.
    echo Current AVD name in config: Pixel_3a_API_34
    echo.
) else (
    echo Emulator executable not found at %ANDROID_SDK_ROOT%\emulator\emulator.exe
    echo Please make sure the Android Emulator is installed via the Android SDK Manager.
)

echo Running Detox tests...
npx detox test --configuration android.emu.debug