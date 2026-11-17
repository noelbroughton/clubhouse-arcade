; Clubhouse installer — per-user, no admin needed.
; Built by make-installer.sh from dist-app/win-unpacked.
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64
RequestExecutionLevel user
!include "MUI2.nsh"
!include "FileFunc.nsh"

!ifndef VERSION
  !define VERSION "1.0.0"
!endif
!define APP "Clubhouse"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Clubhouse"

Name "${APP}"
OutFile "dist-app\Clubhouse-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\Clubhouse"
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
BrandingText "Clubhouse ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Clubhouse"
VIAddVersionKey "FileDescription" "Clubhouse Setup"
VIAddVersionKey "CompanyName" "Noel Broughton"
VIAddVersionKey "LegalCopyright" "Noel Broughton"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"

!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Clubhouse"
!define MUI_WELCOMEPAGE_TEXT "This installs Clubhouse, the launcher for your golf simulator.$\r$\n$\r$\nPick Clubhouse Arcade or GSPro from one screen. Clubhouse starts and closes the right programs (GSPro, NeoTrack, Rela) for each one.$\r$\n$\r$\nNo administrator rights are needed."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Clubhouse.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start Clubhouse now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; close a running copy so its files can be replaced
  nsExec::Exec 'taskkill /IM Clubhouse.exe /T /F'
  Sleep 800
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  File /r "dist-app\win-unpacked\*.*"
  WriteUninstaller "$INSTDIR\Uninstall Clubhouse.exe"

  CreateShortcut "$DESKTOP\Clubhouse.lnk" "$INSTDIR\Clubhouse.exe" "" "$INSTDIR\Clubhouse.exe" 0
  CreateShortcut "$SMPROGRAMS\Clubhouse.lnk" "$INSTDIR\Clubhouse.exe" "" "$INSTDIR\Clubhouse.exe" 0

  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "Clubhouse"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "Noel Broughton"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\Clubhouse.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall Clubhouse.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" $0
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM Clubhouse.exe /T /F'
  Sleep 800
  Delete "$DESKTOP\Clubhouse.lnk"
  Delete "$SMPROGRAMS\Clubhouse.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
  ; settings and leaderboards in %APPDATA%\Clubhouse are kept
SectionEnd
