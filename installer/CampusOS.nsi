!include "MUI2.nsh"
!include "FileFunc.nsh"

# General Definitions
!define PRODUCT_NAME "CampusOS"
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "1.0.0"
!endif
!define PRODUCT_PUBLISHER "CampusOS Team"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\CampusOS.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\dist\CampusOS_${PRODUCT_VERSION}_Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\CampusOS"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel user

# Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "..\frontend\src-tauri\icons\icon.ico"
!define MUI_UNICON "..\frontend\src-tauri\icons\icon.ico"

# Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

# Finish page options
!define MUI_FINISHPAGE_RUN "$INSTDIR\CampusOS.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch CampusOS now"
!insertmacro MUI_PAGE_FINISH

# Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

# Language
!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
    # Terminate any running instances so files are not locked
    nsExec::Exec 'taskkill /F /IM CampusOS.exe /T'
    nsExec::Exec 'taskkill /F /IM campusos-backend.exe /T'
    Sleep 500

    SetOutPath "$INSTDIR"
    SetOverwrite on

    # Copy executables and resources
    File "..\dist\CampusOS.exe"
    File "..\dist\campusos-backend.exe"
    File "..\frontend\src-tauri\icons\icon.ico"

    # Copy frontend static distribution into $INSTDIR\frontend\dist
    SetOutPath "$INSTDIR\frontend\dist"
    File /r "..\frontend\dist\*.*"
    SetOutPath "$INSTDIR"

    # Start Menu Shortcuts
    CreateDirectory "$SMPROGRAMS\CampusOS"
    CreateShortcut "$SMPROGRAMS\CampusOS\CampusOS.lnk" "$INSTDIR\CampusOS.exe" "" "$INSTDIR\icon.ico" 0
    CreateShortcut "$SMPROGRAMS\CampusOS\Uninstall CampusOS.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

    # Desktop Shortcut
    CreateShortcut "$DESKTOP\CampusOS.lnk" "$INSTDIR\CampusOS.exe" "" "$INSTDIR\icon.ico" 0

    # Write Uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    # Registry entries for Add/Remove Programs
    WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\CampusOS.exe"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegDWORD HKCU "${PRODUCT_UNINST_KEY}" "NoModify" 1
    WriteRegDWORD HKCU "${PRODUCT_UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
    # Terminate any running instances
    nsExec::Exec 'taskkill /F /IM CampusOS.exe /T'
    nsExec::Exec 'taskkill /F /IM campusos-backend.exe /T'
    Sleep 500

    # Remove Shortcuts
    Delete "$DESKTOP\CampusOS.lnk"
    Delete "$SMPROGRAMS\CampusOS\CampusOS.lnk"
    Delete "$SMPROGRAMS\CampusOS\Uninstall CampusOS.lnk"
    RMDir "$SMPROGRAMS\CampusOS"

    # Remove Installed Files
    Delete "$INSTDIR\CampusOS.exe"
    Delete "$INSTDIR\campusos-backend.exe"
    Delete "$INSTDIR\icon.ico"
    RMDir /r "$INSTDIR\frontend"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir "$INSTDIR"

    # Remove Registry Keys
    DeleteRegKey HKCU "${PRODUCT_UNINST_KEY}"
    DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"

    SetAutoClose true
SectionEnd
